export interface TestResult {
    passed: boolean;
    description: string;
    details?: string;
}
interface VerificationResult {
    success: boolean;
    testResults: TestResult[];
}
export declare class GitHubService {
    private readonly octokit;
    private readonly workspaceDir;
    constructor();
    createRepository(challengeId: string, username: string): Promise<string>;
    verifyRepositoryChanges(challengeId: string, stepId: number, username: string): Promise<VerificationResult>;
    private setupInitialChallenge;
    private runStepTests;
    private runGitTests;
}
export {};
