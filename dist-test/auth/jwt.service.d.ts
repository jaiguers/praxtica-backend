import { JwtService as NestJwtService } from '@nestjs/jwt';
export declare class JwtService {
    private readonly jwtService;
    constructor(jwtService: NestJwtService);
    generateToken(payload: any): Promise<string>;
    verifyToken(token: string): Promise<any>;
}
