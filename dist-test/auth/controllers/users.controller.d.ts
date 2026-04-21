import { UsersService } from '../services/users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getRanking(userId: string): Promise<{
        ranking: number;
    }>;
    getTopUsers(): Promise<{
        username: string;
        ranking: number;
    }[]>;
    getUserPosition(userId: string): Promise<{
        position: number;
    }>;
}
