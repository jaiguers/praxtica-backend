import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface StoredMessage {
  role: 'user' | 'assistant';
  text: string;
  audioBase64?: string;
  timestamp: number;
}

export interface StoredAudioSegment {
  audioBase64: string;
  timestamp: number;
}

@Injectable()
export class RedisStorageService {
  private readonly logger = new Logger(RedisStorageService.name);
  private readonly redis: Redis;
  private readonly sessionTTL: number;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
      username: this.configService.get<string>('REDIS_USERNAME'),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
      maxRetriesPerRequest: 3,
    });

    this.sessionTTL = this.configService.get<number>('REDIS_SESSION_TTL', 3600); // 1 hour default

    this.redis.on('connect', () => {
      this.logger.log('✅ Redis connected successfully');
    });

    this.redis.on('ready', () => {
      this.logger.log('🚀 Redis is ready to accept commands');
    });

    this.redis.on('error', (error) => {
      this.logger.error('❌ Redis connection error:', error);
    });
  }

  /**
   * Initialize a new session in Redis
   */
  async initializeSession(sessionId: string): Promise<void> {
    const key = this.getSessionKey(sessionId);
    await this.redis.del(key); // Clear any existing data
    // Create an empty list and set TTL
    await this.redis.lpush(key, JSON.stringify({ init: true, timestamp: Date.now() }));
    await this.redis.expire(key, this.sessionTTL);
    // Remove the init marker
    await this.redis.lpop(key);
    this.logger.log(`🔄 Initialized Redis session: ${sessionId}`);
  }

  /**
   * Store user audio segment (without transcription)
   */
  async storeUserAudio(
    sessionId: string,
    audioBase64: string,
    timestamp: number,
  ): Promise<void> {
    const audioSegment: StoredAudioSegment = {
      audioBase64,
      timestamp,
    };

    const key = this.getUserAudioKey(sessionId);
    
    this.logger.log(`🔑 Using Redis key: ${key} for session ${sessionId}`);
    
    const result = await this.redis.lpush(key, JSON.stringify(audioSegment));
    await this.redis.expire(key, this.sessionTTL);
    
    this.logger.log(`🎤 Stored USER audio segment in Redis: ${audioBase64.length} chars (session: ${sessionId}), list length now: ${result}`);
  }

  /**
   * Store a user transcription with audio (legacy method, kept for compatibility)
   */
  async storeUserTranscription(
    sessionId: string,
    text: string,
    audioBase64: string,
    timestamp: number,
  ): Promise<void> {
    const message: StoredMessage = {
      role: 'user',
      text,
      audioBase64,
      timestamp,
    };

    const key = this.getSessionKey(sessionId);
    await this.redis.lpush(key, JSON.stringify(message));
    await this.redis.expire(key, this.sessionTTL);
    
    this.logger.log(`👤 Stored USER message in Redis: "${text}" (session: ${sessionId})`);
  }

  /**
   * Store an assistant response with audio
   */
  async storeAssistantResponse(
    sessionId: string,
    text: string,
    audioBase64: string,
    timestamp: number,
  ): Promise<void> {
    const message: StoredMessage = {
      role: 'assistant',
      text,
      audioBase64,
      timestamp,
    };

    const key = this.getSessionKey(sessionId);
    await this.redis.lpush(key, JSON.stringify(message));
    await this.redis.expire(key, this.sessionTTL);
    
    this.logger.log(`🤖 Stored ASSISTANT message in Redis: "${text.substring(0, 50)}..." (session: ${sessionId})`);
  }

  /**
   * Retrieve all messages for a session
   */
  async getSessionMessages(sessionId: string): Promise<StoredMessage[]> {
    const key = this.getSessionKey(sessionId);
    const messages = await this.redis.lrange(key, 0, -1);
    
    const parsedMessages = messages
      .map(msg => {
        try {
          return JSON.parse(msg) as StoredMessage;
        } catch (error) {
          this.logger.error(`Failed to parse message: ${msg}`, error);
          return null;
        }
      })
      .filter(msg => msg !== null)
      .reverse(); // Reverse to get chronological order

    this.logger.log(`Retrieved ${parsedMessages.length} messages for session ${sessionId}`);
    return parsedMessages;
  }

  /**
   * Retrieve all user audio segments for a session
   */
  async getUserAudioSegments(sessionId: string): Promise<StoredAudioSegment[]> {
    const key = this.getUserAudioKey(sessionId);
    const audioSegments = await this.redis.lrange(key, 0, -1);
    
    const parsedSegments = audioSegments
      .map(segment => {
        try {
          return JSON.parse(segment) as StoredAudioSegment;
        } catch (error) {
          this.logger.error(`Failed to parse audio segment: ${segment}`, error);
          return null;
        }
      })
      .filter(segment => segment !== null)
      .reverse(); // Reverse to get chronological order

    this.logger.log(`Retrieved ${parsedSegments.length} audio segments for session ${sessionId}`);
    return parsedSegments;
  }

  /**
   * Delete a session from Redis (both messages and audio)
   */
  async deleteSession(sessionId: string): Promise<void> {
    const messageKey = this.getSessionKey(sessionId);
    const audioKey = this.getUserAudioKey(sessionId);
    
    const deletedMessages = await this.redis.del(messageKey);
    const deletedAudio = await this.redis.del(audioKey);
    
    if (deletedMessages > 0 || deletedAudio > 0) {
      this.logger.log(`Session ${sessionId} deleted from Redis (messages: ${deletedMessages}, audio: ${deletedAudio})`);
    } else {
      this.logger.warn(`Session ${sessionId} not found in Redis during deletion`);
    }
  }

  private getSessionKey(sessionId: string): string {
    return `session:${sessionId}:messages`;
  }

  private getUserAudioKey(sessionId: string): string {
    return `session:${sessionId}:user_audio`;
  }

  /**
   * Debug method to check what's in Redis for a session
   */
  async debugSession(sessionId: string): Promise<void> {
    const messageKey = this.getSessionKey(sessionId);
    const audioKey = this.getUserAudioKey(sessionId);
    
    const messageCount = await this.redis.llen(messageKey);
    const audioCount = await this.redis.llen(audioKey);
    
    this.logger.log(`🔍 DEBUG Session ${sessionId}: ${messageCount} messages, ${audioCount} audio segments`);
    
    if (audioCount > 0) {
      const firstAudio = await this.redis.lindex(audioKey, 0);
      const lastAudio = await this.redis.lindex(audioKey, -1);
      this.logger.log(`🔍 First audio segment: ${firstAudio?.substring(0, 100)}...`);
      this.logger.log(`🔍 Last audio segment: ${lastAudio?.substring(0, 100)}...`);
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}