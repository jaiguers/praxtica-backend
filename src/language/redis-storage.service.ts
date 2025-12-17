import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface StoredMessage {
  role: 'user' | 'assistant';
  text: string;
  audioBase64?: string;
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
    await this.redis.expire(key, this.sessionTTL);
    this.logger.log(`🔄 Initialized Redis session: ${sessionId}`);
  }

  /**
   * Store a user transcription with audio
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
   * Delete a session from Redis
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = this.getSessionKey(sessionId);
    const deleted = await this.redis.del(key);
    
    if (deleted > 0) {
      this.logger.log(`Session ${sessionId} deleted from Redis`);
    } else {
      this.logger.warn(`Session ${sessionId} not found in Redis during deletion`);
    }
  }

  private getSessionKey(sessionId: string): string {
    return `session:${sessionId}:messages`;
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}