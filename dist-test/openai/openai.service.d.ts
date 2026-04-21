import OpenAI from 'openai';
import { GrammarCheckResponse } from './interfaces/grammar-check.interface';
import { CefrLevel } from '../schemas/user.schema';
export type GrammarCheckLanguage = 'english' | 'spanish';
export interface CheckGrammarOptions {
    text: string;
    language: GrammarCheckLanguage;
    dialectHint?: string;
}
export type CefrPlacementSkill = 'speaking' | 'listening' | 'reading' | 'writing';
export interface CefrPlacementQuestion {
    id: string;
    prompt: string;
    questionType: 'speaking' | 'multiple_choice' | 'short_answer';
    targetLevels: CefrLevel[];
    expectedResponseTimeSeconds: number;
    audioPrompt?: string;
    answerChoices?: {
        label: string;
        text: string;
        targetLevel: CefrLevel;
    }[];
    evaluationCriteria: {
        grammar: string[];
        fluency: string[];
        pronunciation: string[];
        vocabulary: string[];
    };
}
export interface CefrPlacementTest {
    metadata: {
        testName: string;
        totalDurationMinutes: number;
        topics: string[];
    };
    questions: CefrPlacementQuestion[];
    scoringGuide: {
        howToScore: string;
        levelMapping: {
            [K in CefrLevel]?: {
                grammar: {
                    min: number;
                    max: number;
                };
                fluency: {
                    min: number;
                    max: number;
                };
                pronunciation: {
                    min: number;
                    max: number;
                };
                vocabulary: {
                    min: number;
                    max: number;
                };
            };
        };
    };
}
export declare class OpenAIService {
    private readonly logger;
    readonly openai: OpenAI;
    private readonly grammarModel;
    private readonly placementModel;
    constructor();
    checkGrammar(options: CheckGrammarOptions): Promise<GrammarCheckResponse>;
    generateCefrPlacementTest(options: {
        topics?: string[];
    }): Promise<CefrPlacementTest>;
    private extractJson;
    private buildGrammarSchema;
    private buildCefrPlacementSchema;
    private buildEnglishGrammarPrompt;
    private buildSpanishGrammarPrompt;
}
