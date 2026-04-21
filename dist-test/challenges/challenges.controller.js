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
exports.ChallengesController = void 0;
const common_1 = require("@nestjs/common");
const challenges_service_1 = require("./challenges.service");
const jwt_guard_1 = require("../auth/jwt.guard");
let ChallengesController = class ChallengesController {
    constructor(challengesService) {
        this.challengesService = challengesService;
    }
    async getAllChallenges() {
        return this.challengesService.getAllChallenges();
    }
    async getChallengeById(id) {
        return this.challengesService.getChallengeById(id);
    }
    async createChallenge(challengeData) {
        return this.challengesService.createChallenge(challengeData);
    }
    async updateStepStatus(challengeId, stepId, status, req) {
        const canProceed = await this.challengesService.checkUsageLimits(req.user.sub, 'git');
        if (!canProceed) {
            throw new Error('Has alcanzado el límite de uso para tu plan gratuito. Considera actualizar a un plan premium.');
        }
        const challenge = await this.challengesService.updateStepStatus(challengeId, stepId, status);
        await this.challengesService.updateChallengeProgress(req.user.sub, challengeId, stepId);
        return challenge;
    }
    async verifyChallenge(challengeId, stepId, githubUsername, req) {
        return this.challengesService.verifyChallenge(challengeId, stepId, githubUsername, req.user.sub);
    }
    async initializeRepository(challengeId, githubUsername) {
        return this.challengesService.initializeRepository(challengeId, githubUsername);
    }
    async updateChallengeFeedback(challengeId, stepId, feedback, type, req) {
        const canProceed = await this.challengesService.checkUsageLimits(req.user.sub, type);
        if (!canProceed) {
            return {
                success: false,
                message: 'Has alcanzado el límite de uso para tu plan gratuito. Considera actualizar a un plan premium.',
                testResults: []
            };
        }
        await this.challengesService.updateChallengeProgress(req.user.sub, challengeId, stepId, feedback);
        return { success: true };
    }
    async updateChallengeGit(challengeId, stepId, req) {
        const canProceed = await this.challengesService.checkUsageLimits(req.user.sub, 'git');
        if (!canProceed) {
            return {
                success: false,
                message: 'Has alcanzado el límite de uso para tu plan gratuito. Considera actualizar a un plan premium.',
                testResults: []
            };
        }
        await this.challengesService.updateChallengeProgress(req.user.sub, challengeId, stepId);
        return { success: true };
    }
    async checkUsageLimits(challengeType, req) {
        try {
            if (!req.user) {
                throw new common_1.HttpException('Usuario no autenticado', common_1.HttpStatus.UNAUTHORIZED);
            }
            if (!['git', 'english', 'spanish'].includes(challengeType)) {
                throw new common_1.HttpException('Tipo de desafío inválido. Debe ser "git" o "english" o "spanish"', common_1.HttpStatus.BAD_REQUEST);
            }
            const canProceed = await this.challengesService.checkUsageLimits(req.user.sub, challengeType);
            return {
                success: canProceed,
                message: canProceed ? 'Puedes continuar con el desafío' : 'Has alcanzado el límite de uso para tu plan gratuito',
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException(error.message || 'Error al verificar los límites de uso', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.ChallengesController = ChallengesController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChallengesController.prototype, "getAllChallenges", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChallengesController.prototype, "getChallengeById", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChallengesController.prototype, "createChallenge", null);
__decorate([
    (0, common_1.Patch)(':id/steps/:stepId/status'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('stepId')),
    __param(2, (0, common_1.Body)('status')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, String, Object]),
    __metadata("design:returntype", Promise)
], ChallengesController.prototype, "updateStepStatus", null);
__decorate([
    (0, common_1.Post)(':id/verify'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('stepId')),
    __param(2, (0, common_1.Body)('githubUsername')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, String, Object]),
    __metadata("design:returntype", Promise)
], ChallengesController.prototype, "verifyChallenge", null);
__decorate([
    (0, common_1.Get)(':id/initialize'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('githubUsername')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ChallengesController.prototype, "initializeRepository", null);
__decorate([
    (0, common_1.Post)(':id/feedback'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('stepId')),
    __param(2, (0, common_1.Body)('feedback')),
    __param(3, (0, common_1.Body)('type')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Object, String, Object]),
    __metadata("design:returntype", Promise)
], ChallengesController.prototype, "updateChallengeFeedback", null);
__decorate([
    (0, common_1.Post)(':id/updateChallengeGit'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('stepId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Object]),
    __metadata("design:returntype", Promise)
], ChallengesController.prototype, "updateChallengeGit", null);
__decorate([
    (0, common_1.Get)('check-usage/:type'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChallengesController.prototype, "checkUsageLimits", null);
exports.ChallengesController = ChallengesController = __decorate([
    (0, common_1.Controller)('api/challenges'),
    __metadata("design:paramtypes", [challenges_service_1.ChallengesService])
], ChallengesController);
//# sourceMappingURL=challenges.controller.js.map