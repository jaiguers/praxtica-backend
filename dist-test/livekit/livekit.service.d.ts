import { ConfigService } from '@nestjs/config';
export declare class LiveKitService {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    generateToken(userId: string, sessionId: string, participantName?: string): Promise<string>;
}
