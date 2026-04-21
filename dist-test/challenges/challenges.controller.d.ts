import { ChallengesService } from './challenges.service';
import { Challenge } from '../schemas/challenge.schema';
interface CheckUsageResponse {
    success: boolean;
    message: string;
}
export declare class ChallengesController {
    private readonly challengesService;
    constructor(challengesService: ChallengesService);
    getAllChallenges(): Promise<Challenge[]>;
    getChallengeById(id: string): Promise<Challenge>;
    createChallenge(challengeData: Partial<Challenge>): Promise<Challenge>;
    updateStepStatus(challengeId: string, stepId: number, status: string, req: any): Promise<Challenge>;
    verifyChallenge(challengeId: string, stepId: number, githubUsername: string, req: any): Promise<{
        success: boolean;
        message: string;
        testResults: import("./github.service").TestResult[];
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
    updateChallengeFeedback(challengeId: string, stepId: number, feedback: {
        type: string;
    }, type: string, req: any): Promise<{
        success: boolean;
        message: string;
        testResults: any[];
    } | {
        success: boolean;
        message?: undefined;
        testResults?: undefined;
    }>;
    updateChallengeGit(challengeId: string, stepId: number, req: any): Promise<{
        success: boolean;
        message: string;
        testResults: any[];
    } | {
        success: boolean;
        message?: undefined;
        testResults?: undefined;
    }>;
    checkUsageLimits(challengeType: string, req: any): Promise<CheckUsageResponse>;
}
export {};
