import { ConfigService } from '@nestjs/config';
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
export declare class RedisStorageService {
    private readonly configService;
    private readonly logger;
    private readonly redis;
    private readonly sessionTTL;
    constructor(configService: ConfigService);
    initializeSession(sessionId: string): Promise<void>;
    storeUserAudio(sessionId: string, audioBase64: string, timestamp: number): Promise<void>;
    storeUserTranscription(sessionId: string, text: string, audioBase64: string, timestamp: number): Promise<void>;
    storeAssistantResponse(sessionId: string, text: string, audioBase64: string, timestamp: number): Promise<void>;
    getSessionMessages(sessionId: string): Promise<StoredMessage[]>;
    getUserAudioSegments(sessionId: string): Promise<StoredAudioSegment[]>;
    deleteSession(sessionId: string): Promise<void>;
    private getSessionKey;
    private getUserAudioKey;
    debugSession(sessionId: string): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
