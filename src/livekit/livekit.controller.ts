import { Controller, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { LiveKitService } from './livekit.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

interface TokenRequest {
    sessionId: string;
    participantName?: string;
}

@Controller('api/livekit')
export class LiveKitController {
    constructor(private readonly livekitService: LiveKitService) { }

    @UseGuards(JwtAuthGuard)
    @Post('token')
    async getToken(@Req() req: any, @Body() body: any) {
        const userId = req.user.id || req.user.sub || req.user.userId;

        // Aceptamos tanto sessionId como roomName para mayor compatibilidad con el front
        const sessionId = body.sessionId || body.roomName;

        if (!sessionId) {
            console.error('❌ [LiveKitController] Error: sessionId o roomName no proporcionado en el body:', body);
            throw new BadRequestException('sessionId or roomName is required');
        }

        const token = await this.livekitService.generateToken(
            String(userId),
            sessionId,
            body.participantName,
        );
        return { token };
    }
}
