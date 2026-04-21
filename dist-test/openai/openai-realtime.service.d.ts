import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
export type Language = 'english' | 'spanish';
export type ConversationRole = 'system' | 'user' | 'assistant';
export interface ConversationItem {
    role: ConversationRole;
    content: string;
}
export type RealtimeEventType = 'session.created' | 'session.updated' | 'session.cleared' | 'input_audio_buffer.speech_started' | 'input_audio_buffer.speech_stopped' | 'input_audio_buffer.committed' | 'input_audio_buffer.discarded' | 'conversation.item.input_audio_transcription.completed' | 'conversation.item.input_audio_transcription.failed' | 'response.created' | 'response.audio_transcript.delta' | 'response.audio_transcript.done' | 'response.audio.delta' | 'response.audio.done' | 'response.content.done' | 'response.done' | 'response.function_call_arguments.done' | 'error';
export interface RealtimeEvent {
    type: RealtimeEventType;
    event_id?: string;
    [key: string]: unknown;
}
export interface RealtimeSessionConfig {
    language: Language;
    userId: string;
    sessionId: string;
    level?: string;
    temperature?: number;
    voice?: string;
    systemPrompt?: string;
    mode?: 'practice' | 'test';
}
export interface RealtimeSession {
    id: string;
    ws: WebSocket | null;
    config: RealtimeSessionConfig;
    status: 'connecting' | 'connected' | 'disconnected' | 'error';
    eventEmitter: EventEmitter;
}
export declare class OpenAIRealtimeService {
    private readonly openai;
    private readonly logger;
    private readonly sessions;
    private readonly defaultVoiceByLanguage;
    private readonly defaultSystemPrompts;
    constructor();
    createSession(config: RealtimeSessionConfig): Promise<RealtimeSession>;
    private setupWebSocketHandlers;
    private configureSession;
    private createInitialResponse;
    private handleRealtimeEvent;
    extractCefrLevelFromResponse(responseText: string): string | null;
    private isEvaluationResponse;
    sendAudio(sessionId: string, audioData: ArrayBuffer | Buffer | Uint8Array | Int16Array): void;
    commitAudio(sessionId: string): void;
    discardAudio(sessionId: string): void;
    private sendEvent;
    getSession(sessionId: string): RealtimeSession | undefined;
    closeSession(sessionId: string): Promise<void>;
    getEventEmitter(sessionId: string): EventEmitter | undefined;
    streamResponse(conversation: ConversationItem[], options: {
        language: Language;
        voice?: string;
        temperature?: number;
        maxOutputTokens?: number;
    }): Promise<AsyncIterable<{
        type: string;
        delta?: string;
        [key: string]: unknown;
    }> & {
        finalResponse?: () => Promise<unknown>;
    }>;
    private mapStreamToLegacyFormat;
}
