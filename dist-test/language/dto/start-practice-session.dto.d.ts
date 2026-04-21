import { Language, CefrLevel } from '../../schemas/user.schema';
export declare class StartPracticeSessionDto {
    sessionId?: string;
    language: Language;
    level: CefrLevel;
    startedAt?: string;
    topics?: string[];
    goal?: string;
    aiPersona?: string;
    captureAudio?: boolean;
    isTest?: boolean;
}
