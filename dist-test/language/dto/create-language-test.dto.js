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
exports.CreateLanguageTestDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const user_schema_1 = require("../../schemas/user.schema");
const LANGUAGE_TEST_ATTACHMENT_KINDS = [
    'audio',
    'transcript',
    'screenshot',
];
class LanguageTestBreakdownDto {
}
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], LanguageTestBreakdownDto.prototype, "grammar", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], LanguageTestBreakdownDto.prototype, "pronunciation", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], LanguageTestBreakdownDto.prototype, "vocabulary", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], LanguageTestBreakdownDto.prototype, "fluency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], LanguageTestBreakdownDto.prototype, "listening", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], LanguageTestBreakdownDto.prototype, "reading", void 0);
class LanguageTestAttachmentDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LanguageTestAttachmentDto.prototype, "url", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(LANGUAGE_TEST_ATTACHMENT_KINDS),
    __metadata("design:type", String)
], LanguageTestAttachmentDto.prototype, "kind", void 0);
class LanguageTestMetadataDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LanguageTestMetadataDto.prototype, "promptSeed", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LanguageTestMetadataDto.prototype, "aiModel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], LanguageTestMetadataDto.prototype, "durationSeconds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LanguageTestMetadataDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(10),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => LanguageTestAttachmentDto),
    __metadata("design:type", Array)
], LanguageTestMetadataDto.prototype, "attachments", void 0);
class CreateLanguageTestDto {
}
exports.CreateLanguageTestDto = CreateLanguageTestDto;
__decorate([
    (0, class_validator_1.IsEnum)(user_schema_1.LANGUAGES),
    __metadata("design:type", String)
], CreateLanguageTestDto.prototype, "language", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateLanguageTestDto.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(user_schema_1.CEFR_LEVELS),
    __metadata("design:type", String)
], CreateLanguageTestDto.prototype, "level", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(120),
    __metadata("design:type", Number)
], CreateLanguageTestDto.prototype, "score", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => LanguageTestBreakdownDto),
    __metadata("design:type", LanguageTestBreakdownDto)
], CreateLanguageTestDto.prototype, "breakdown", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => LanguageTestMetadataDto),
    __metadata("design:type", LanguageTestMetadataDto)
], CreateLanguageTestDto.prototype, "metadata", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateLanguageTestDto.prototype, "allowRetake", void 0);
//# sourceMappingURL=create-language-test.dto.js.map