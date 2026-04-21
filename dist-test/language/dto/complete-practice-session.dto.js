"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompletePracticeSessionDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const user_schema_1 = require("../../schemas/user.schema");
const CONVERSATION_ROLES = ['user', 'assistant'];
class MispronouncedWordDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MispronouncedWordDto.prototype, "word", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], MispronouncedWordDto.prototype, "attempts", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], MispronouncedWordDto.prototype, "lastHeard", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MispronouncedWordDto.prototype, "ipa", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MispronouncedWordDto.prototype, "notes", void 0);
class PronunciationFeedbackDto {
}
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], PronunciationFeedbackDto.prototype, "score", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(50),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => MispronouncedWordDto),
    __metadata("design:type", Array)
], PronunciationFeedbackDto.prototype, "mispronouncedWords", void 0);
class GrammarErrorDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GrammarErrorDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GrammarErrorDto.prototype, "example", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GrammarErrorDto.prototype, "correction", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GrammarErrorDto.prototype, "notes", void 0);
class GrammarFeedbackDto {
}
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], GrammarFeedbackDto.prototype, "score", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(50),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => GrammarErrorDto),
    __metadata("design:type", Array)
], GrammarFeedbackDto.prototype, "errors", void 0);
class VocabularyFeedbackDto {
}
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], VocabularyFeedbackDto.prototype, "score", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(50),
    (0, class_validator_1.ArrayUnique)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], VocabularyFeedbackDto.prototype, "rareWordsUsed", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(50),
    (0, class_validator_1.ArrayUnique)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], VocabularyFeedbackDto.prototype, "repeatedWords", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(50),
    (0, class_validator_1.ArrayUnique)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], VocabularyFeedbackDto.prototype, "suggestedWords", void 0);
class NativeRangeDto {
}
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], NativeRangeDto.prototype, "min", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], NativeRangeDto.prototype, "max", void 0);
class WordFrequencyDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WordFrequencyDto.prototype, "word", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], WordFrequencyDto.prototype, "count", void 0);
class FluencyFeedbackDto {
}
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], FluencyFeedbackDto.prototype, "score", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], FluencyFeedbackDto.prototype, "wordsPerMinute", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => NativeRangeDto),
    __metadata("design:type", NativeRangeDto)
], FluencyFeedbackDto.prototype, "nativeRange", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], FluencyFeedbackDto.prototype, "pausesPerMinute", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], FluencyFeedbackDto.prototype, "fillerWordsCount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(1),
    __metadata("design:type", Number)
], FluencyFeedbackDto.prototype, "fillerWordsRatio", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(20),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => WordFrequencyDto),
    __metadata("design:type", Array)
], FluencyFeedbackDto.prototype, "mostUsedWords", void 0);
class ConversationTranscriptItemDto {
}
__decorate([
    (0, class_validator_1.IsEnum)(CONVERSATION_ROLES),
    __metadata("design:type", String)
], ConversationTranscriptItemDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConversationTranscriptItemDto.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ConversationTranscriptItemDto.prototype, "timestamp", void 0);
class ConversationAudioItemDto {
}
__decorate([
    (0, class_validator_1.IsEnum)(CONVERSATION_ROLES),
    __metadata("design:type", String)
], ConversationAudioItemDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConversationAudioItemDto.prototype, "url", void 0);
class ConversationLogDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConversationLogDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(500),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ConversationTranscriptItemDto),
    __metadata("design:type", Array)
], ConversationLogDto.prototype, "transcript", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(200),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ConversationAudioItemDto),
    __metadata("design:type", Array)
], ConversationLogDto.prototype, "audioUrls", void 0);
class PracticeFeedbackDto {
}
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PronunciationFeedbackDto),
    __metadata("design:type", PronunciationFeedbackDto)
], PracticeFeedbackDto.prototype, "pronunciation", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => GrammarFeedbackDto),
    __metadata("design:type", GrammarFeedbackDto)
], PracticeFeedbackDto.prototype, "grammar", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => VocabularyFeedbackDto),
    __metadata("design:type", VocabularyFeedbackDto)
], PracticeFeedbackDto.prototype, "vocabulary", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => FluencyFeedbackDto),
    __metadata("design:type", FluencyFeedbackDto)
], PracticeFeedbackDto.prototype, "fluency", void 0);
class CompletePracticeSessionDto {
}
exports.CompletePracticeSessionDto = CompletePracticeSessionDto;
__decorate([
    (0, class_validator_1.IsEnum)(user_schema_1.LANGUAGES),
    __metadata("design:type", String)
], CompletePracticeSessionDto.prototype, "language", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(user_schema_1.CEFR_LEVELS),
    __metadata("design:type", String)
], CompletePracticeSessionDto.prototype, "level", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CompletePracticeSessionDto.prototype, "endedAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CompletePracticeSessionDto.prototype, "durationSeconds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PracticeFeedbackDto),
    __metadata("design:type", PracticeFeedbackDto)
], CompletePracticeSessionDto.prototype, "feedback", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ConversationLogDto),
    __metadata("design:type", ConversationLogDto)
], CompletePracticeSessionDto.prototype, "conversationLog", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], CompletePracticeSessionDto.prototype, "wordsCount", void 0);
//# sourceMappingURL=complete-practice-session.dto.js.map