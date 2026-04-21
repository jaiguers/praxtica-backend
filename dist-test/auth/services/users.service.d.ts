import { Model } from 'mongoose';
import { UserDocument } from '../user.model';
export declare class UsersService {
    private userModel;
    constructor(userModel: Model<UserDocument>);
    findById(id: string): Promise<UserDocument | null>;
    getRanking(userId: string): Promise<number>;
    getTopUsers(limit?: number): Promise<{
        username: string;
        ranking: number;
    }[]>;
    getUserPosition(userId: string): Promise<number>;
}
