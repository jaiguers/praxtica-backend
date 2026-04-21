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
exports.StartPracticeSessionDto = void 0;
const class_validator_1 = require("class-validator");
const user_schema_1 = require("../../schemas/user.schema");
class StartPracticeSessionDto {
}
exports.StartPracticeSessionDto = StartPracticeSessionDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StartPracticeSessionDto.prototype, "sessionId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(user_schema_1.LANGUAGES),
    __metadata("design:type", String)
], StartPracticeSessionDto.prototype, "language", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(user_schema_1.CEFR_LEVELS),
    __metadata("design:type", String)
], StartPracticeSessionDto.prototype, "level", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], StartPracticeSessionDto.prototype, "startedAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(10),
    (0, class_validator_1.ArrayUnique)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], StartPracticeSessionDto.prototype, "topics", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StartPracticeSessionDto.prototype, "goal", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StartPracticeSessionDto.prototype, "aiPersona", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], StartPracticeSessionDto.prototype, "captureAudio", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], StartPracticeSessionDto.prototype, "isTest", void 0);
//# sourceMappingURL=start-practice-session.dto.js.map