import { Model } from 'mongoose';
import { UserDocument } from '../user.model';
export declare class UserService {
    private userModel;
    constructor(userModel: Model<UserDocument>);
    findById(id: string): Promise<UserDocument | null>;
    incrementRanking(userId: string): Promise<void>;
    getRanking(userId: string): Promise<number>;
}
