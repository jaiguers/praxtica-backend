import { Language, CefrLevel } from '../../schemas/user.schema';
declare const LANGUAGE_TEST_ATTACHMENT_KINDS: readonly ["audio", "transcript", "screenshot"];
type LanguageTestAttachmentKind = (typeof LANGUAGE_TEST_ATTACHMENT_KINDS)[number];
declare class LanguageTestBreakdownDto {
    grammar: number;
    pronunciation: number;
    vocabulary: number;
    fluency: number;
    listening?: number;
    reading?: number;
}
declare class LanguageTestAttachmentDto {
    url: string;
    kind: LanguageTestAttachmentKind;
}
declare class LanguageTestMetadataDto {
    promptSeed?: string;
    aiModel?: string;
    durationSeconds?: number;
    notes?: string;
    attachments?: LanguageTestAttachmentDto[];
}
export declare class CreateLanguageTestDto {
    language: Language;
    date: string;
    level: CefrLevel;
    score?: number;
    breakdown: LanguageTestBreakdownDto;
    metadata?: LanguageTestMetadataDto;
    allowRetake?: boolean;
}
export {};
