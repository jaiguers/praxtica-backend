import { CefrLevel, Language } from '../../schemas/user.schema';
declare const CONVERSATION_ROLES: readonly ["user", "assistant"];
type ConversationRole = (typeof CONVERSATION_ROLES)[number];
declare class MispronouncedWordDto {
    word: string;
    attempts: number;
    lastHeard: string;
    ipa?: string;
    notes?: string;
}
declare class PronunciationFeedbackDto {
    score: number;
    mispronouncedWords: MispronouncedWordDto[];
}
declare class GrammarErrorDto {
    type: string;
    example?: string;
    correction?: string;
    notes?: string;
}
declare class GrammarFeedbackDto {
    score: number;
    errors: GrammarErrorDto[];
}
declare class VocabularyFeedbackDto {
    score: number;
    rareWordsUsed: string[];
    repeatedWords: string[];
    suggestedWords: string[];
}
declare class NativeRangeDto {
    min: number;
    max: number;
}
declare class WordFrequencyDto {
    word: string;
    count: number;
}
declare class FluencyFeedbackDto {
    score: number;
    wordsPerMinute: number;
    nativeRange: NativeRangeDto;
    pausesPerMinute: number;
    fillerWordsCount?: number;
    fillerWordsRatio?: number;
    mostUsedWords?: WordFrequencyDto[];
}
declare class ConversationTranscriptItemDto {
    role: ConversationRole;
    text: string;
    timestamp: number;
}
declare class ConversationAudioItemDto {
    role: ConversationRole;
    url: string;
}
declare class ConversationLogDto {
    title?: string;
    transcript?: ConversationTranscriptItemDto[];
    audioUrls?: ConversationAudioItemDto[];
}
declare class PracticeFeedbackDto {
    pronunciation: PronunciationFeedbackDto;
    grammar: GrammarFeedbackDto;
    vocabulary: VocabularyFeedbackDto;
    fluency: FluencyFeedbackDto;
}
export declare class CompletePracticeSessionDto {
    language: Language;
    level?: CefrLevel;
    endedAt: string;
    durationSeconds?: number;
    feedback?: PracticeFeedbackDto;
    conversationLog?: ConversationLogDto;
    wordsCount?: number;
}
export {};
