"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RedisStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisStorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
let RedisStorageService = RedisStorageService_1 = class RedisStorageService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(RedisStorageService_1.name);
        this.redis = new ioredis_1.default({
            host: this.configService.get('REDIS_HOST'),
            port: this.configService.get('REDIS_PORT'),
            username: this.configService.get('REDIS_USERNAME'),
            password: this.configService.get('REDIS_PASSWORD'),
            db: this.configService.get('REDIS_DB', 0),
            maxRetriesPerRequest: 3,
        });
        this.sessionTTL = this.configService.get('REDIS_SESSION_TTL', 3600);
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
    async initializeSession(sessionId) {
        const key = this.getSessionKey(sessionId);
        await this.redis.del(key);
        await this.redis.lpush(key, JSON.stringify({ init: true, timestamp: Date.now() }));
        await this.redis.expire(key, this.sessionTTL);
        await this.redis.lpop(key);
        this.logger.log(`🔄 Initialized Redis session: ${sessionId}`);
    }
    async storeUserAudio(sessionId, audioBase64, timestamp) {
        const audioSegment = {
            audioBase64,
            timestamp,
        };
        const key = this.getUserAudioKey(sessionId);
        const result = await this.redis.lpush(key, JSON.stringify(audioSegment));
        await this.redis.expire(key, this.sessionTTL);
    }
    async storeUserTranscription(sessionId, text, audioBase64, timestamp) {
        const message = {
            role: 'user',
            text,
            audioBase64,
            timestamp,
        };
        const key = this.getSessionKey(sessionId);
        await this.redis.lpush(key, JSON.stringify(message));
        await this.redis.expire(key, this.sessionTTL);
    }
    async storeAssistantResponse(sessionId, text, audioBase64, timestamp) {
        const message = {
            role: 'assistant',
            text,
            audioBase64,
            timestamp,
        };
        const key = this.getSessionKey(sessionId);
        await this.redis.lpush(key, JSON.stringify(message));
        await this.redis.expire(key, this.sessionTTL);
        this.logger.log(`🤖 Assistant: "${text.substring(0, 50)}..."`);
    }
    async getSessionMessages(sessionId) {
        const key = this.getSessionKey(sessionId);
        const messages = await this.redis.lrange(key, 0, -1);
        const parsedMessages = messages
            .map(msg => {
            try {
                return JSON.parse(msg);
            }
            catch (error) {
                this.logger.error(`Failed to parse message: ${msg}`, error);
                return null;
            }
        })
            .filter(msg => msg !== null)
            .reverse();
        this.logger.debug(`Retrieved ${parsedMessages.length} messages for session ${sessionId}`);
        return parsedMessages;
    }
    async getUserAudioSegments(sessionId) {
        const key = this.getUserAudioKey(sessionId);
        const audioSegments = await this.redis.lrange(key, 0, -1);
        const parsedSegments = audioSegments
            .map(segment => {
            try {
                return JSON.parse(segment);
            }
            catch (error) {
                this.logger.error(`Failed to parse audio segment: ${segment}`, error);
                return null;
            }
        })
            .filter(segment => segment !== null)
            .reverse();
        this.logger.debug(`Retrieved ${parsedSegments.length} audio segments for session ${sessionId}`);
        return parsedSegments;
    }
    async deleteSession(sessionId) {
        const messageKey = this.getSessionKey(sessionId);
        const audioKey = this.getUserAudioKey(sessionId);
        const deletedMessages = await this.redis.del(messageKey);
        const deletedAudio = await this.redis.del(audioKey);
        if (deletedMessages > 0 || deletedAudio > 0) {
            this.logger.log(`Session ${sessionId} deleted from Redis (messages: ${deletedMessages}, audio: ${deletedAudio})`);
        }
        else {
            this.logger.warn(`Session ${sessionId} not found in Redis during deletion`);
        }
    }
    getSessionKey(sessionId) {
        return `session:${sessionId}:messages`;
    }
    getUserAudioKey(sessionId) {
        return `session:${sessionId}:user_audio`;
    }
    async debugSession(sessionId) {
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
};
exports.RedisStorageService = RedisStorageService;
exports.RedisStorageService = RedisStorageService = RedisStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisStorageService);
//# sourceMappingURL=redis-storage.service.js.map