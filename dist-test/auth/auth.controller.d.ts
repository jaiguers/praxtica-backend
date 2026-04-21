import { AuthService } from './auth.service';
import { Response } from 'express';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    githubAuth(): Promise<void>;
    verifyToken(req: any): Promise<{
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
    }>;
    registerGitHubUser(userData: {
        githubId: string;
        email: string;
        name: string;
        avatar: string;
        accessToken: string;
        username: string;
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
    githubAuthCallback(req: any, res: Response): Promise<void>;
    updateSubscription(req: any, subscriptionData: any): Promise<import("./user.model").UserDocument>;
}
