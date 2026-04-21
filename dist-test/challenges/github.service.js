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
exports.GitHubService = void 0;
const common_1 = require("@nestjs/common");
const rest_1 = require("@octokit/rest");
const simple_git_1 = require("simple-git");
const path = require("path");
const fs = require("fs");
let GitHubService = class GitHubService {
    constructor() {
        this.octokit = new rest_1.Octokit({
            auth: process.env.GITHUB_TOKEN
        });
        this.workspaceDir = path.join(process.cwd(), 'workspace');
    }
    async createRepository(challengeId, username) {
        const repoName = `${challengeId}-challenge`;
        try {
            const { data } = await this.octokit.repos.createForAuthenticatedUser({
                name: repoName,
                private: true,
                auto_init: true
            });
            const repoPath = path.join(this.workspaceDir, username, repoName);
            if (!fs.existsSync(repoPath)) {
                fs.mkdirSync(repoPath, { recursive: true });
            }
            const git = (0, simple_git_1.default)();
            await git.clone(data.clone_url, repoPath);
            await this.setupInitialChallenge(challengeId, repoPath);
            return data.html_url;
        }
        catch (error) {
            console.error('Error creating repository:', error);
            throw new Error('Error al crear el repositorio');
        }
    }
    async verifyRepositoryChanges(challengeId, stepId, username) {
        const repoName = `${challengeId}-challenge`;
        const repoPath = path.join(this.workspaceDir, username, repoName);
        try {
            const git = (0, simple_git_1.default)(repoPath);
            await git.fetch('origin');
            const status = await git.status();
            if (status.modified.length > 0 || status.not_added.length > 0) {
                return {
                    success: false,
                    testResults: [{
                            passed: false,
                            description: 'Hay cambios sin commitear',
                            details: 'Asegúrate de hacer commit y push de todos tus cambios.'
                        }]
                };
            }
            const testResults = await this.runStepTests(challengeId, stepId, repoPath);
            const allTestsPassed = testResults.every(test => test.passed);
            return {
                success: allTestsPassed,
                testResults
            };
        }
        catch (error) {
            console.error('Error verifying changes:', error);
            throw new Error('Error al verificar los cambios');
        }
    }
    async setupInitialChallenge(challengeId, repoPath) {
        const templatePath = path.join(process.cwd(), 'templates', challengeId);
        if (fs.existsSync(templatePath)) {
            fs.cpSync(templatePath, repoPath, { recursive: true });
            const git = (0, simple_git_1.default)(repoPath);
            await git.add('.');
            await git.commit('Initial challenge setup');
            await git.push('origin', 'main');
        }
    }
    async runStepTests(challengeId, stepId, repoPath) {
        const testResults = [];
        try {
            switch (challengeId) {
                case 'git-clone':
                    testResults.push(...await this.runGitTests(stepId, repoPath));
                    break;
                default:
                    throw new Error('Desafío no soportado');
            }
        }
        catch (error) {
            console.error('Error running tests:', error);
            testResults.push({
                passed: false,
                description: 'Error al ejecutar las pruebas',
                details: error.message
            });
        }
        return testResults;
    }
    async runGitTests(stepId, repoPath) {
        const testResults = [];
        const git = (0, simple_git_1.default)(repoPath);
        switch (stepId) {
            case 5:
                try {
                    const objects = await fs.promises.readdir(path.join(repoPath, '.git', 'objects'));
                    const hasBlob = objects.some(dir => dir.length === 2 && dir !== 'info' && dir !== 'pack');
                    testResults.push({
                        passed: hasBlob,
                        description: 'Crear un objeto blob',
                        details: hasBlob
                            ? 'Se encontró un objeto blob en el repositorio'
                            : 'No se encontró ningún objeto blob'
                    });
                }
                catch (error) {
                    testResults.push({
                        passed: false,
                        description: 'Error al verificar el objeto blob',
                        details: error.message
                    });
                }
                break;
        }
        return testResults;
    }
};
exports.GitHubService = GitHubService;
exports.GitHubService = GitHubService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GitHubService);
//# sourceMappingURL=github.service.js.map