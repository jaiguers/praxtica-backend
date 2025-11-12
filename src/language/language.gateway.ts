import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { LanguageService, RealtimeEvent } from './language.service';

interface JoinSessionPayload {
  userId: string;
  sessionId: string;
  language: string;
}

interface TranscriptPayload {
  sessionId: string;
  userId: string;
  text: string;
  isFinal?: boolean;
  timestamp?: number;
}

interface AssistantEventPayload {
  sessionId: string;
  text: string;
  audioUrl?: string;
  metadata?: Record<string, unknown>;
}

@UseGuards(JwtAuthGuard)
@WebSocketGateway({
  cors: { origin: true },
  namespace: '/language-practice',
})
export class LanguageGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server: Server;

  constructor(private readonly languageService: LanguageService) {}

  afterInit(): void {
    this.languageService.registerGateway(this);
  }

  handleConnection(client: Socket): void {
    client.emit('session:event', {
      type: 'system.connected',
      timestamp: Date.now(),
    });
  }

  handleDisconnect(client: Socket): void {
    if (client.data?.sessionId) {
      client.leave(client.data.sessionId);
    }
  }

  @SubscribeMessage('joinSession')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinSessionPayload,
  ): { status: 'joined'; sessionId: string } {
    client.join(payload.sessionId);
    client.data.sessionId = payload.sessionId;
    client.data.userId = payload.userId;
    const event: RealtimeEvent = {
      type: 'session.event',
      payload: {
        sessionId: payload.sessionId,
        role: 'user',
        text: `Usuario ${payload.userId} se unió a la sesión`,
        isFinal: true,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    this.languageService.emitRealtimeEvent(payload.sessionId, event);
    return { status: 'joined', sessionId: payload.sessionId };
  }

  @SubscribeMessage('userTranscript')
  handleTranscript(
    @MessageBody() payload: TranscriptPayload,
  ): void {
    void this.languageService.handleUserTranscript(
      payload.userId,
      payload.sessionId,
      payload.text,
      payload.isFinal,
      payload.timestamp,
    );
  }

  @SubscribeMessage('assistantMessage')
  handleAssistantMessage(
    @MessageBody() payload: AssistantEventPayload,
  ): void {
    const assistantEvent: RealtimeEvent = {
      type: 'assistant.message',
      payload: {
        sessionId: payload.sessionId,
        text: payload.text,
        audioUrl: payload.audioUrl,
        metadata: payload.metadata,
      },
      timestamp: Date.now(),
    };
    this.languageService.emitRealtimeEvent(payload.sessionId, assistantEvent);
    this.server.to(payload.sessionId).emit('session:event', assistantEvent);
  }

  dispatchSessionEvent(sessionId: string, event: RealtimeEvent): void {
    this.server.to(sessionId).emit('session:event', event);
  }
}

