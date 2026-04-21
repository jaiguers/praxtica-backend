import { GrammarCheckLanguage } from '../openai.service';
export declare class GrammarCheckDto {
    text: string;
    language: GrammarCheckLanguage;
    dialectHint?: string;
}
