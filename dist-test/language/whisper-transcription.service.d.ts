import { Language } from '../schemas/user.schema';
export declare class WhisperTranscriptionService {
    private readonly logger;
    private readonly openai;
    constructor();
    transcribeAudio(audioBase64: string, language: Language, sessionId: string): Promise<string>;
    private convertPCM16ToWAV;
}
