import { Model } from 'mongoose';
import { Challenge, ChallengeDocument } from '../schemas/challenge.schema';
import { GitHubService } from './github.service';
import { TestResult } from './github.service';
import { UserService } from '../auth/services/user.service';
export declare class ChallengesService {
    private challengeModel;
    private readonly githubService;
    private readonly userService;
    constructor(challengeModel: Model<ChallengeDocument>, githubService: GitHubService, userService: UserService);
    getAllChallenges(): Promise<ChallengeDocument[]>;
    getChallengeById(id: string): Promise<ChallengeDocument>;
    createChallenge(challengeData: Partial<Challenge>): Promise<ChallengeDocument>;
    updateStepStatus(challengeId: string, stepId: number, status: string): Promise<ChallengeDocument>;
    checkUsageLimits(userId: string, challengeType: string): Promise<boolean>;
    updateChallengeProgress(userId: string, challengeId: string, stepId: number, feedback?: {
        type: string;
    }): Promise<void>;
    verifyChallenge(challengeId: string, stepId: number, githubUsername: string, userId: string): Promise<{
        success: boolean;
        message: string;
        testResults: TestResult[];
    }>;
    initializeRepository(challengeId: string, githubUsername: string): Promise<{
        success: boolean;
        repoUrl: string;
        message?: undefined;
    } | {
        success: boolean;
        message: string;
        repoUrl?: undefined;
    }>;
}
