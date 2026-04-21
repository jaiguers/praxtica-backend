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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageController = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const jwt_guard_1 = require("../auth/jwt.guard");
const language_service_1 = require("./language.service");
const migration_service_1 = require("./migration.service");
const create_language_test_dto_1 = require("./dto/create-language-test.dto");
const start_practice_session_dto_1 = require("./dto/start-practice-session.dto");
const complete_practice_session_dto_1 = require("./dto/complete-practice-session.dto");
let LanguageController = class LanguageController {
    constructor(languageService, migrationService) {
        this.languageService = languageService;
        this.migrationService = migrationService;
    }
    createLanguageTest(userId, dto) {
        return this.languageService.createLanguageTest(userId, dto);
    }
    startPracticeSession(userId, dto) {
        return this.languageService.startPracticeSession(userId, dto);
    }
    completePracticeSession(userId, sessionId, dto) {
        return this.languageService.completePracticeSession(userId, sessionId, dto);
    }
    async migratePracticeSessionTitles() {
        return this.migrationService.migratePracticeSessionTitles();
    }
    streamPracticeSession(sessionId) {
        return this.languageService.getSessionStream(sessionId);
    }
};
exports.LanguageController = LanguageController;
__decorate([
    (0, common_1.Post)('users/:userId/tests'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_language_test_dto_1.CreateLanguageTestDto]),
    __metadata("design:returntype", void 0)
], LanguageController.prototype, "createLanguageTest", null);
__decorate([
    (0, common_1.Post)('users/:userId/practice-sessions'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, start_practice_session_dto_1.StartPracticeSessionDto]),
    __metadata("design:returntype", void 0)
], LanguageController.prototype, "startPracticeSession", null);
__decorate([
    (0, common_1.Patch)('users/:userId/practice-sessions/:sessionId/complete'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Param)('sessionId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, complete_practice_session_dto_1.CompletePracticeSessionDto]),
    __metadata("design:returntype", void 0)
], LanguageController.prototype, "completePracticeSession", null);
__decorate([
    (0, common_1.Post)('migrate/practice-session-titles'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LanguageController.prototype, "migratePracticeSessionTitles", null);
__decorate([
    (0, common_1.Sse)('users/:userId/practice-sessions/:sessionId/stream'),
    __param(0, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", rxjs_1.Observable)
], LanguageController.prototype, "streamPracticeSession", null);
exports.LanguageController = LanguageController = __decorate([
    (0, common_1.Controller)('api/language'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [language_service_1.LanguageService,
        migration_service_1.MigrationService])
], LanguageController);
//# sourceMappingURL=language.controller.js.map