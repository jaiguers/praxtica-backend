import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIRealtimeService } from '../openai/openai-realtime.service';
import { LiveKitService } from './livekit.service';
export declare class LiveKitAgentService implements OnModuleDestroy {
    private readonly configService;
    private readonly livekitService;
    private readonly openaiRealtimeService;
    private readonly logger;
    private readonly activeRooms;
    private readonly audioSources;
    private readonly publishedTrackSids;
    private readonly assistantTranscriptState;
    constructor(configService: ConfigService, livekitService: LiveKitService, openaiRealtimeService: OpenAIRealtimeService);
    joinRoomAsAgent(sessionId: string, userId: string): Promise<void>;
    private handleIncomingAudio;
    private bridgeOpenAIToLiveKit;
    private bridgeOpenAITranscriptToLiveKit;
    private getOrCreateAssistantTranscriptState;
    private publishTranscriptionSegment;
    private cleanup;
    onModuleDestroy(): Promise<void>;
}
