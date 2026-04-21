import { MessageEvent } from '@nestjs/common';
import { Model } from 'mongoose';
import { Observable } from 'rxjs';
import { UserDocument, Language, LanguageTest, PracticeSession } from '../schemas/user.schema';
import { CreateLanguageTestDto } from './dto/create-language-test.dto';
import { StartPracticeSessionDto } from './dto/start-practice-session.dto';
import { CompletePracticeSessionDto } from './dto/complete-practice-session.dto';
import { LanguageAnalyticsService, PracticeAnalyticsResult } from './language-analytics.service';
import { OpenAIRealtimeService } from '../openai/openai-realtime.service';
import { LiveKitAgentService } from '../livekit/livekit-agent.service';
import { RedisStorageService } from './redis-storage.service';
import { CefrAnalysisService } from './cefr-analysis.service';
import { OpenAIService } from '../openai/openai.service';
export type RealtimeEvent = {
    type: 'session.started';
    payload: {
        sessionId: string;
        userId: string;
        language: Language;
    };
    timestamp: number;
} | {
    type: 'session.event';
    payload: {
        sessionId: string;
        role: 'user' | 'assistant';
        text: string;
        isFinal?: boolean;
        timestamp: number;
    };
    timestamp: number;
} | {
    type: 'assistant.message';
    payload: {
        sessionId: string;
        text: string;
        delta?: string;
        isFinal?: boolean;
        audioUrl?: string;
        metadata?: Record<string, unknown>;
    };
    timestamp: number;
} | {
    type: 'session.completed';
    payload: PracticeAnalyticsResult['metrics'];
    timestamp: number;
};
export declare class LanguageService {
    private readonly userModel;
    private readonly analyticsService;
    private readonly redisStorage;
    private readonly cefrAnalysis;
    private readonly openAIService;
    private readonly realtimeService;
    private readonly livekitAgentService;
    private readonly logger;
    private readonly sessionStreams;
    constructor(userModel: Model<UserDocument>, analyticsService: LanguageAnalyticsService, redisStorage: RedisStorageService, cefrAnalysis: CefrAnalysisService, openAIService: OpenAIService, realtimeService: OpenAIRealtimeService, livekitAgentService: LiveKitAgentService);
    createLanguageTest(userId: string, dto: CreateLanguageTestDto): Promise<LanguageTest>;
    startPracticeSession(userId: string, dto: StartPracticeSessionDto): Promise<PracticeSession>;
    completePracticeSession(userId: string, sessionId: string, dto: CompletePracticeSessionDto): Promise<PracticeSession>;
    getSessionStream(sessionId: string): Observable<MessageEvent>;
    emitRealtimeEvent(sessionId: string, event: RealtimeEvent): void;
    completeRealtimeStream(sessionId: string): void;
    private ensureStream;
    private applyPracticeFeedback;
    private upsertCurrentLevel;
    private buildSystemPrompt;
    private ensureUser;
    private isSameObjectId;
    initializeRedisSession(sessionId: string): Promise<void>;
    storeUserTranscription(sessionId: string, text: string, audioBase64: string, timestamp: number): Promise<void>;
    storeAssistantResponse(sessionId: string, text: string, audioBase64: string, timestamp: number): Promise<void>;
    private generateConversationTitle;
    private generateAITitle;
    private getNextPracticeNumber;
}
