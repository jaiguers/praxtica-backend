import { Model } from 'mongoose';
import { UserDocument } from '../schemas/user.schema';
export declare class MigrationService {
    private readonly userModel;
    private readonly logger;
    constructor(userModel: Model<UserDocument>);
    migratePracticeSessionTitles(): Promise<{
        updated: number;
        total: number;
    }>;
    private generateMigrationTitle;
}
