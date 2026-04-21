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
exports.ChallengesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const challenge_schema_1 = require("../schemas/challenge.schema");
const github_service_1 = require("./github.service");
const user_service_1 = require("../auth/services/user.service");
let ChallengesService = class ChallengesService {
    constructor(challengeModel, githubService, userService) {
        this.challengeModel = challengeModel;
        this.githubService = githubService;
        this.userService = userService;
    }
    async getAllChallenges() {
        return this.challengeModel.find({ active: true }).exec();
    }
    async getChallengeById(id) {
        return this.challengeModel.findById(id).exec();
    }
    async createChallenge(challengeData) {
        if (!challengeData.type) {
            challengeData.type = 'git';
        }
        if (challengeData.type === 'english' || challengeData.type === 'spanish') {
            challengeData.steps = [];
        }
        else {
            const steps = challengeData.steps || [];
            const hasIntro = steps.some(step => step.title === 'Introduccion');
            if (!hasIntro) {
                steps.unshift({
                    title: 'Introduccion',
                    description: 'Introducción al desafío',
                    status: 'pending',
                    isActive: true,
                    tabs: {
                        instructions: {
                            text: 'Instrucciones de introducción',
                            task: {
                                title: 'Leer la introducción',
                                description: 'Lee cuidadosamente la introducción al desafío',
                                status: 'pending'
                            }
                        }
                    }
                });
            }
            const hasRepoSetup = steps.some(step => step.title === 'Configurar Repo');
            if (!hasRepoSetup) {
                const introIndex = steps.findIndex(step => step.title === 'Introduccion');
                steps.splice(introIndex + 1, 0, {
                    title: 'Configurar Repo',
                    description: 'Configuración del repositorio',
                    status: 'pending',
                    isActive: false,
                    tabs: {
                        instructions: {
                            text: 'Instrucciones para configurar el repositorio',
                            task: {
                                title: 'Configurar el repositorio',
                                description: 'Configura el repositorio según las instrucciones',
                                status: 'pending'
                            }
                        }
                    }
                });
            }
            challengeData.steps = steps;
        }
        const newChallenge = new this.challengeModel(challengeData);
        return newChallenge.save();
    }
    async updateStepStatus(challengeId, stepId, status) {
        const challenge = await this.challengeModel.findById(challengeId);
        if (!challenge) {
            throw new Error('Desafío no encontrado');
        }
        if (challenge.type !== 'git') {
            throw new Error('Los desafíos de tipo "idiomas" no tienen pasos');
        }
        if (stepId < 0 || stepId >= challenge.steps.length) {
            throw new Error('Paso no encontrado');
        }
        challenge.steps[stepId].status = status;
        if (challenge.steps[stepId].tabs?.instructions?.task) {
            challenge.steps[stepId].tabs.instructions.task.status = status;
        }
        return challenge.save();
    }
    async checkUsageLimits(userId, challengeType) {
        const user = await this.userService.findById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }
        if (user.subscription.plan !== 'free') {
            const currentDate = new Date();
            return user.subscription.endDate > currentDate;
        }
        if (challengeType === 'english' || challengeType === 'spanish') {
            const progress = user.challengeProgress.find(p => p.language === challengeType);
            if (!progress) {
                return true;
            }
            return progress.completedSteps.length < 5;
        }
        else if (challengeType === 'git') {
            const progress = user.challengeProgress.find(p => p.language === 'git');
            if (!progress) {
                return true;
            }
            return progress.currentStep < 4;
        }
        return true;
    }
    async updateChallengeProgress(userId, challengeId, stepId, feedback) {
        const user = await this.userService.findById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }
        const challenge = await this.challengeModel.findById(challengeId);
        if (!challenge) {
            throw new Error('Desafío no encontrado');
        }
        const existingProgressIndex = user.challengeProgress.findIndex(p => p.challengeId === challengeId);
        if (existingProgressIndex !== -1) {
            const existingProgress = user.challengeProgress[existingProgressIndex];
            if (!existingProgress.completedSteps.includes(stepId)) {
                existingProgress.completedSteps.push(stepId);
                existingProgress.currentStep = stepId;
                existingProgress.lastUpdated = new Date();
                user.challengeProgress[existingProgressIndex] = existingProgress;
                if (challenge.type === 'git' && challenge.steps[stepId].status === 'completed') {
                    await this.userService.incrementRanking(userId);
                }
                else if ((challenge.type === 'english' || challenge.type === 'spanish') && feedback?.type === 'perfect') {
                    await this.userService.incrementRanking(userId);
                }
            }
        }
        else {
            user.challengeProgress.push({
                challengeId,
                language: challenge.type,
                currentStep: stepId,
                completedSteps: [stepId],
                startedAt: new Date(),
                lastUpdated: new Date()
            });
            if (challenge.type === 'git' && challenge.steps[stepId].status === 'completed') {
                await this.userService.incrementRanking(userId);
            }
            else if ((challenge.type === 'english' || challenge.type === 'spanish') && feedback?.type === 'perfect') {
                await this.userService.incrementRanking(userId);
            }
        }
        await user.save();
    }
    async verifyChallenge(challengeId, stepId, githubUsername, userId) {
        try {
            const challenge = await this.challengeModel.findById(challengeId);
            if (!challenge) {
                throw new Error('Desafío no encontrado');
            }
            const canProceed = await this.checkUsageLimits(userId, challenge.type);
            if (!canProceed) {
                return {
                    success: false,
                    message: 'Has alcanzado el límite de uso para tu plan gratuito. Considera actualizar a un plan premium.',
                    testResults: []
                };
            }
            if (challenge.type !== 'git') {
                throw new Error('Los desafíos de tipo "idiomas" no tienen pasos para verificar');
            }
            const verificationResult = await this.githubService.verifyRepositoryChanges(challengeId, stepId, githubUsername);
            if (verificationResult.success) {
                await this.updateStepStatus(challengeId, stepId, 'completed');
                await this.updateChallengeProgress(userId, challengeId, stepId);
            }
            return {
                success: verificationResult.success,
                message: verificationResult.success ? '¡Excelente trabajo!' : 'Hay algunos problemas que corregir',
                testResults: verificationResult.testResults
            };
        }
        catch (error) {
            console.error('Error verifying challenge:', error);
            return {
                success: false,
                message: 'Error al verificar el desafío',
                testResults: []
            };
        }
    }
    async initializeRepository(challengeId, githubUsername) {
        try {
            const challenge = await this.challengeModel.findById(challengeId);
            if (!challenge) {
                throw new Error('Desafío no encontrado');
            }
            if (challenge.type !== 'git') {
                throw new Error('Los desafíos de tipo "idiomas" no requieren inicialización de repositorio');
            }
            const repoUrl = await this.githubService.createRepository(challengeId, githubUsername);
            return {
                success: true,
                repoUrl
            };
        }
        catch (error) {
            console.error('Error initializing repository:', error);
            return {
                success: false,
                message: 'Error al inicializar el repositorio'
            };
        }
    }
};
exports.ChallengesService = ChallengesService;
exports.ChallengesService = ChallengesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(challenge_schema_1.Challenge.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        github_service_1.GitHubService,
        user_service_1.UserService])
], ChallengesService);
//# sourceMappingURL=challenges.service.js.map