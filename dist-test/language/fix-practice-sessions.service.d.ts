import { Model } from 'mongoose';
import { UserDocument } from '../schemas/user.schema';
export declare class FixPracticeSessionsService {
    private readonly userModel;
    private readonly logger;
    constructor(userModel: Model<UserDocument>);
    fixInvalidStartedAtDates(): Promise<{
        fixed: number;
        total: number;
    }>;
    validatePracticeSessionsIntegrity(): Promise<{
        totalSessions: number;
        invalidDates: number;
        missingLevels: number;
        inconsistentLevels: number;
    }>;
}
