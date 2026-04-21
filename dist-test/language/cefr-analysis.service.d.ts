import { Language, CefrLevel } from '../schemas/user.schema';
import { StoredMessage } from './redis-storage.service';
import { PracticeFeedbackAggregate } from './language-analytics.service';
export interface CefrAnalysisResult {
    level: CefrLevel;
    feedback: PracticeFeedbackAggregate;
    confidence: number;
    analysisNotes: string;
    extractedLevel?: CefrLevel;
    audioSuppressed?: boolean;
}
export declare class CefrAnalysisService {
    private readonly logger;
    private readonly openai;
    constructor();
    extractCefrLevelFromResponse(responseText: string): CefrLevel | null;
    isEvaluationResponse(responseText: string): boolean;
    analyzeCefrLevel(language: Language, messages: StoredMessage[], sessionDurationSeconds: number): Promise<CefrAnalysisResult>;
    private createAnalysisPrompt;
    private mapToFeedbackStructure;
    private createFallbackFeedback;
}
