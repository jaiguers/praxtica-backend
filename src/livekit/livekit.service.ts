import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class LiveKitService {
    private readonly logger = new Logger(LiveKitService.name);

    constructor(private readonly configService: ConfigService) { }

    async generateToken(userId: string, sessionId: string, participantName?: string) {
        const apiKey = this.configService.get<string>('LIVEKIT_API_KEY');
        const apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET');

        if (!apiKey || !apiSecret) {
            this.logger.error('LiveKit API key or secret not configured');
            throw new Error('LiveKit configuration missing');
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: userId,
            name: participantName || userId,
            metadata: JSON.stringify({ sessionId }),
        });

        at.addGrant({
            room: sessionId,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        return await at.toJwt();
    }
}
