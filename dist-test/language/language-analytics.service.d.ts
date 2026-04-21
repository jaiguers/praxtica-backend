import { CefrLevel, Language } from '../schemas/user.schema';
import { CompletePracticeSessionDto } from './dto/complete-practice-session.dto';
export interface PracticeFeedbackAggregate {
    pronunciation: {
        score: number;
        mispronouncedWords: {
            word: string;
            attempts: number;
            lastHeard: Date;
            ipa?: string;
            notes?: string;
        }[];
    };
    grammar: {
        score: number;
        errors: {
            type: string;
            example?: string;
            correction?: string;
            notes?: string;
        }[];
    };
    vocabulary: {
        score: number;
        rareWordsUsed: string[];
        repeatedWords: string[];
        suggestedWords: string[];
    };
    fluency: {
        score: number;
        wordsPerMinute: number;
        nativeRange: {
            min: number;
            max: number;
        };
        pausesPerMinute: number;
        fillerWordsCount?: number;
        fillerWordsRatio?: number;
        mostUsedWords?: {
            word: string;
            count: number;
        }[];
    };
}
export interface PracticeAnalyticsResult {
    feedback: PracticeFeedbackAggregate;
    conversationLog?: {
        title?: string;
        transcript?: {
            role: 'user' | 'assistant';
            text: string;
            timestamp: number;
        }[];
        audioUrls?: {
            role: 'user' | 'assistant';
            url: string;
        }[];
    };
    metrics: {
        averageScore: number;
        recommendedLevel: CefrLevel;
        fluencyRatio: number;
    };
}
export declare class LanguageAnalyticsService {
    private readonly cefrOrder;
    createInitialFeedback(_language: Language, level: CefrLevel): PracticeFeedbackAggregate;
    analyzeCompletion(dto: CompletePracticeSessionDto, extractedLevel?: CefrLevel): PracticeAnalyticsResult;
    private normalizeFeedback;
    private recommendLevel;
    private getNativeRange;
}
