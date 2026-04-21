import { Model } from 'mongoose';
import { UserDocument, AuthProvider } from './user.model';
import { JwtService } from './jwt.service';
export declare class AuthService {
    private userModel;
    private readonly jwtService;
    constructor(userModel: Model<UserDocument>, jwtService: JwtService);
    validateUserByProvider(provider: AuthProvider, providerId: string): Promise<UserDocument | null>;
    validateUser(githubId: string, username: string): Promise<UserDocument>;
    generateToken(user: UserDocument): Promise<string>;
    createUser(profile: any): Promise<UserDocument>;
    login(user: UserDocument): Promise<{
        user: {
            id: string;
            username: string;
            name: string;
            email: string;
            ranking: number;
            avatarUrl: string;
            subscription: {
                plan: "free" | "monthly" | "annual" | "enterprise";
                startDate: Date;
                endDate: Date;
                seats?: number;
                active: boolean;
            };
            challengeProgress: {
                challengeId: string;
                language: string;
                currentStep: number;
                completedSteps: number[];
                startedAt: Date;
                lastUpdated: Date;
            }[];
            languageTests: {
                [k: string]: {
                    language: import("./user.model").Language;
                    date: Date;
                    level: import("./user.model").CefrLevel;
                    score?: number;
                    breakdown: {
                        grammar: number;
                        pronunciation: number;
                        vocabulary: number;
                        fluency: number;
                        listening?: number;
                        reading?: number;
                    };
                    metadata?: {
                        promptSeed?: string;
                        aiModel?: string;
                        durationSeconds?: number;
                        notes?: string;
                        attachments?: {
                            url: string;
                            kind: "audio" | "transcript" | "screenshot";
                        }[];
                    };
                };
            };
            practiceSessions: import("./user.model").PracticeSession[];
        };
        token: string;
    }>;
    private migrateLegacyUser;
    private canAuthenticateWithProvider;
    private updateUserProviderData;
    private createUserWithProvider;
    loginOrRegisterByProvider(provider: AuthProvider, userData: {
        providerId: string;
        email: string;
        name?: string;
        username: string;
        avatar: string;
        accessToken: string;
        refreshToken?: string;
    }): Promise<{
        user: {
            id: string;
            username: string;
            name: string;
            email: string;
            ranking: number;
            avatarUrl: string;
            subscription: {
                plan: "free" | "monthly" | "annual" | "enterprise";
                startDate: Date;
                endDate: Date;
                seats?: number;
                active: boolean;
            };
            challengeProgress: {
                challengeId: string;
                language: string;
                currentStep: number;
                completedSteps: number[];
                startedAt: Date;
                lastUpdated: Date;
            }[];
            languageTests: {
                [k: string]: {
                    language: import("./user.model").Language;
                    date: Date;
                    level: import("./user.model").CefrLevel;
                    score?: number;
                    breakdown: {
                        grammar: number;
                        pronunciation: number;
                        vocabulary: number;
                        fluency: number;
                        listening?: number;
                        reading?: number;
                    };
                    metadata?: {
                        promptSeed?: string;
                        aiModel?: string;
                        durationSeconds?: number;
                        notes?: string;
                        attachments?: {
                            url: string;
                            kind: "audio" | "transcript" | "screenshot";
                        }[];
                    };
                };
            };
            practiceSessions: import("./user.model").PracticeSession[];
        };
        token: string;
    }>;
    registerGitHubUser(userData: {
        githubId: string;
        email: string;
        name: string;
        username: string;
        avatar: string;
        accessToken: string;
    }): Promise<{
        user: {
            id: string;
            username: string;
            name: string;
            email: string;
            ranking: number;
            avatarUrl: string;
            subscription: {
                plan: "free" | "monthly" | "annual" | "enterprise";
                startDate: Date;
                endDate: Date;
                seats?: number;
                active: boolean;
            };
            challengeProgress: {
                challengeId: string;
                language: string;
                currentStep: number;
                completedSteps: number[];
                startedAt: Date;
                lastUpdated: Date;
            }[];
            languageTests: {
                [k: string]: {
                    language: import("./user.model").Language;
                    date: Date;
                    level: import("./user.model").CefrLevel;
                    score?: number;
                    breakdown: {
                        grammar: number;
                        pronunciation: number;
                        vocabulary: number;
                        fluency: number;
                        listening?: number;
                        reading?: number;
                    };
                    metadata?: {
                        promptSeed?: string;
                        aiModel?: string;
                        durationSeconds?: number;
                        notes?: string;
                        attachments?: {
                            url: string;
                            kind: "audio" | "transcript" | "screenshot";
                        }[];
                    };
                };
            };
            practiceSessions: import("./user.model").PracticeSession[];
        };
        token: string;
    }>;
    registerGmailUser(userData: {
        googleId: string;
        email: string;
        name?: string;
        username: string;
        avatar: string;
        accessToken: string;
        refreshToken: string;
    }): Promise<{
        user: {
            id: string;
            username: string;
            name: string;
            email: string;
            ranking: number;
            avatarUrl: string;
            subscription: {
                plan: "free" | "monthly" | "annual" | "enterprise";
                startDate: Date;
                endDate: Date;
                seats?: number;
                active: boolean;
            };
            challengeProgress: {
                challengeId: string;
                language: string;
                currentStep: number;
                completedSteps: number[];
                startedAt: Date;
                lastUpdated: Date;
            }[];
            languageTests: {
                [k: string]: {
                    language: import("./user.model").Language;
                    date: Date;
                    level: import("./user.model").CefrLevel;
                    score?: number;
                    breakdown: {
                        grammar: number;
                        pronunciation: number;
                        vocabulary: number;
                        fluency: number;
                        listening?: number;
                        reading?: number;
                    };
                    metadata?: {
                        promptSeed?: string;
                        aiModel?: string;
                        durationSeconds?: number;
                        notes?: string;
                        attachments?: {
                            url: string;
                            kind: "audio" | "transcript" | "screenshot";
                        }[];
                    };
                };
            };
            practiceSessions: import("./user.model").PracticeSession[];
        };
        token: string;
    }>;
    registerOutlookUser(userData: {
        microsoftId: string;
        email: string;
        name?: string;
        username: string;
        avatar: string;
        accessToken: string;
        refreshToken: string;
    }): Promise<{
        user: {
            id: string;
            username: string;
            name: string;
            email: string;
            ranking: number;
            avatarUrl: string;
            subscription: {
                plan: "free" | "monthly" | "annual" | "enterprise";
                startDate: Date;
                endDate: Date;
                seats?: number;
                active: boolean;
            };
            challengeProgress: {
                challengeId: string;
                language: string;
                currentStep: number;
                completedSteps: number[];
                startedAt: Date;
                lastUpdated: Date;
            }[];
            languageTests: {
                [k: string]: {
                    language: import("./user.model").Language;
                    date: Date;
                    level: import("./user.model").CefrLevel;
                    score?: number;
                    breakdown: {
                        grammar: number;
                        pronunciation: number;
                        vocabulary: number;
                        fluency: number;
                        listening?: number;
                        reading?: number;
                    };
                    metadata?: {
                        promptSeed?: string;
                        aiModel?: string;
                        durationSeconds?: number;
                        notes?: string;
                        attachments?: {
                            url: string;
                            kind: "audio" | "transcript" | "screenshot";
                        }[];
                    };
                };
            };
            practiceSessions: import("./user.model").PracticeSession[];
        };
        token: string;
    }>;
    findUserById(id: string): Promise<UserDocument>;
    updateSubscription(userId: string, subscriptionData: any): Promise<UserDocument>;
}
