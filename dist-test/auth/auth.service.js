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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_model_1 = require("./user.model");
const jwt_service_1 = require("./jwt.service");
let AuthService = class AuthService {
    constructor(userModel, jwtService) {
        this.userModel = userModel;
        this.jwtService = jwtService;
    }
    async validateUserByProvider(provider, providerId) {
        return this.userModel.findOne({
            [`authProviders.${provider}.providerId`]: providerId
        }).exec();
    }
    async validateUser(githubId, username) {
        let user = await this.userModel.findOne({
            $or: [
                { githubId },
                { 'authProviders.github.providerId': githubId }
            ]
        });
        if (!user) {
            throw new Error('validateUser legacy method requires email. Use registerUserByProvider instead.');
        }
        return user;
    }
    async generateToken(user) {
        const payload = {
            sub: user._id.toString(),
            username: user.username,
            email: user.email,
        };
        return this.jwtService.generateToken(payload);
    }
    async createUser(profile) {
        const authProviders = new Map();
        if (profile.githubId && profile.accessToken) {
            authProviders.set('github', {
                provider: 'github',
                providerId: profile.githubId,
                accessToken: profile.accessToken,
                email: profile.email,
                connectedAt: new Date(),
            });
        }
        const newUser = new this.userModel({
            email: profile.email,
            username: profile.username,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
            authProviders,
            ...(profile.githubId && {
                githubId: profile.githubId,
                githubAccessToken: profile.accessToken,
            }),
            subscription: {
                plan: 'free',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                active: true,
            },
            challengeProgress: [],
        });
        return newUser.save();
    }
    async login(user) {
        const token = await this.generateToken(user);
        const languageTests = user.languageTests ?
            Object.fromEntries(user.languageTests) : {};
        return {
            user: {
                id: user._id.toString(),
                username: user.username,
                name: user.name,
                email: user.email,
                ranking: user.ranking,
                avatarUrl: user.avatarUrl,
                subscription: user.subscription,
                challengeProgress: user.challengeProgress,
                languageTests,
                practiceSessions: user.practiceSessions || [],
            },
            token,
        };
    }
    migrateLegacyUser(user, provider, userData) {
        if (provider !== 'github' || !user.githubId) {
            return;
        }
        if (!user.authProviders) {
            user.authProviders = new Map();
        }
        if (user.authProviders.has(provider)) {
            return;
        }
        const normalizedGithubId = String(user.githubId);
        const normalizedProviderId = String(userData.providerId);
        if (normalizedGithubId === normalizedProviderId) {
            user.authProviders.set(provider, {
                provider,
                providerId: normalizedGithubId,
                accessToken: user.githubAccessToken || userData.accessToken,
                refreshToken: userData.refreshToken,
                email: user.email,
                connectedAt: user.createdAt || new Date(),
            });
        }
    }
    canAuthenticateWithProvider(user, provider, providerId) {
        if (!user.authProviders || user.authProviders.size === 0) {
            if (provider === 'github' && user.githubId) {
                const normalizedGithubId = String(user.githubId);
                const normalizedProviderId = String(providerId);
                if (normalizedGithubId === normalizedProviderId) {
                    return true;
                }
            }
            return false;
        }
        const providerData = user.authProviders.get(provider);
        if (!providerData) {
            return false;
        }
        const normalizedStoredId = String(providerData.providerId);
        const normalizedProviderId = String(providerId);
        return normalizedStoredId === normalizedProviderId;
    }
    updateUserProviderData(user, provider, userData) {
        if (!user.authProviders) {
            user.authProviders = new Map();
        }
        const existingProviderData = user.authProviders.get(provider);
        const connectedAt = existingProviderData?.connectedAt || user.createdAt || new Date();
        user.authProviders.set(provider, {
            provider,
            providerId: userData.providerId,
            accessToken: userData.accessToken,
            refreshToken: userData.refreshToken,
            email: userData.email,
            connectedAt,
        });
        if (userData.name)
            user.name = userData.name;
        if (userData.avatar)
            user.avatarUrl = userData.avatar;
        if (userData.username)
            user.username = userData.username;
        if (provider === 'github') {
            user.githubId = userData.providerId;
            user.githubAccessToken = userData.accessToken;
        }
    }
    async createUserWithProvider(provider, userData) {
        const authProviders = new Map();
        authProviders.set(provider, {
            provider,
            providerId: userData.providerId,
            accessToken: userData.accessToken,
            refreshToken: userData.refreshToken,
            email: userData.email,
            connectedAt: new Date(),
        });
        return this.userModel.create({
            email: userData.email,
            username: userData.username,
            name: userData.name,
            avatarUrl: userData.avatar,
            authProviders,
            ...(provider === 'github' && {
                githubId: userData.providerId,
                githubAccessToken: userData.accessToken,
            }),
            subscription: {
                plan: 'free',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                active: true,
            },
        });
    }
    async loginOrRegisterByProvider(provider, userData) {
        const existingUser = await this.userModel.findOne({
            email: userData.email,
        }).exec();
        if (existingUser) {
            this.migrateLegacyUser(existingUser, provider, userData);
            if (this.canAuthenticateWithProvider(existingUser, provider, userData.providerId)) {
                this.updateUserProviderData(existingUser, provider, userData);
                await existingUser.save();
                return this.login(existingUser);
            }
            else {
                throw new common_1.ConflictException(`Ya existe un usuario con el email ${userData.email}. El email debe ser único independientemente del proveedor de autenticación.`);
            }
        }
        const newUser = await this.createUserWithProvider(provider, userData);
        return this.login(newUser);
    }
    async registerGitHubUser(userData) {
        return this.loginOrRegisterByProvider('github', {
            providerId: userData.githubId,
            email: userData.email,
            name: userData.name,
            username: userData.username,
            avatar: userData.avatar,
            accessToken: userData.accessToken,
        });
    }
    async registerGmailUser(userData) {
        return this.loginOrRegisterByProvider('gmail', {
            providerId: userData.googleId,
            email: userData.email,
            name: userData.name,
            username: userData.username,
            avatar: userData.avatar,
            accessToken: userData.accessToken,
            refreshToken: userData.refreshToken,
        });
    }
    async registerOutlookUser(userData) {
        return this.loginOrRegisterByProvider('outlook', {
            providerId: userData.microsoftId,
            email: userData.email,
            name: userData.name,
            username: userData.username,
            avatar: userData.avatar,
            accessToken: userData.accessToken,
            refreshToken: userData.refreshToken,
        });
    }
    async findUserById(id) {
        return this.userModel.findById(id);
    }
    async updateSubscription(userId, subscriptionData) {
        return this.userModel.findByIdAndUpdate(userId, {
            $set: {
                subscription: {
                    ...subscriptionData,
                    active: true
                }
            }
        }, { new: true });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_model_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        jwt_service_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map