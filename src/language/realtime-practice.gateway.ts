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
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OpenAIRealtimeService } from '../openai/openai-realtime.service';
import { EventEmitter } from 'events';
import { Language } from '../schemas/user.schema';

interface StartPracticePayload {
  userId: string;
  sessionId: string;
  language: Language;
  level?: string;
  mode?: 'practice' | 'test'; // 'practice' = práctica libre, 'test' = test CEFR
}

interface AudioChunkPayload {
  sessionId: string;
  audio: string; // Base64 encoded audio
}

interface ConversationItem {
  role: 'user' | 'assistant';
  content: string;
}

@WebSocketGateway({
  cors: { origin: true },
  namespace: '/realtime-practice',
  transports: ['websocket', 'polling'],
})
export class RealtimePracticeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server: Server;
  private readonly logger = new Logger(RealtimePracticeGateway.name);
  private readonly sessionToSocketMap = new Map<string, Socket>();
  private readonly socketToSessionMap = new Map<string, string>();

  constructor(private readonly realtimeService: OpenAIRealtimeService) {}

  afterInit(): void {
    this.logger.log('RealtimePracticeGateway initialized');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', { clientId: client.id, timestamp: Date.now() });
  }

  handleDisconnect(client: Socket): void {
    const sessionId = this.socketToSessionMap.get(client.id);
    if (sessionId) {
      this.logger.log(`Client ${client.id} disconnected from session ${sessionId}`);
      this.sessionToSocketMap.delete(sessionId);
      this.socketToSessionMap.delete(client.id);
      // Cerrar sesión de OpenAI Realtime
      void this.realtimeService.closeSession(sessionId);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('start-practice')
  async handleStartPractice(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: StartPracticePayload,
  ): Promise<{ status: 'started' | 'error'; sessionId: string; message?: string }> {
    try {
      const mode = payload.mode || 'practice'; // Por defecto es práctica libre
      this.logger.log(
        `Starting ${mode} session ${payload.sessionId} for user ${payload.userId}`,
      );

      // Crear sesión de OpenAI Realtime con configuración según el modo
      const session = await this.realtimeService.createSession({
        sessionId: payload.sessionId,
        userId: payload.userId,
        language: payload.language,
        level: payload.level,
        mode, // Pasar el modo a la sesión
      });

      // Mapear socket a sesión
      this.sessionToSocketMap.set(payload.sessionId, client);
      this.socketToSessionMap.set(client.id, payload.sessionId);

      // Configurar listeners de eventos de OpenAI Realtime
      const eventEmitter = this.realtimeService.getEventEmitter(payload.sessionId);
      if (eventEmitter) {
        this.setupRealtimeEventListeners(payload.sessionId, eventEmitter, client);
      }

      client.emit('practice-started', {
        sessionId: payload.sessionId,
        timestamp: Date.now(),
      });

      return { status: 'started', sessionId: payload.sessionId };
    } catch (error) {
      this.logger.error(
        `Error starting practice session ${payload.sessionId}:`,
        error,
      );
      client.emit('error', {
        type: 'session-start-error',
        message: 'Failed to start practice session',
        timestamp: Date.now(),
      });
      return {
        status: 'error',
        sessionId: payload.sessionId,
        message: (error as Error).message,
      };
    }
  }

  /**
   * Configura los listeners de eventos de OpenAI Realtime API
   */
  private setupRealtimeEventListeners(
    sessionId: string,
    eventEmitter: EventEmitter,
    client: Socket,
  ): void {
    // Usuario empezó a hablar
    eventEmitter.on('user.speech.started', () => {
      client.emit('user-speech-started', { sessionId, timestamp: Date.now() });
    });

    // Usuario terminó de hablar
    eventEmitter.on('user.speech.stopped', () => {
      client.emit('user-speech-stopped', { sessionId, timestamp: Date.now() });
      // Commit del audio automáticamente después de que el usuario deje de hablar
      this.realtimeService.commitAudio(sessionId);
    });

    // Transcripción del usuario completada
    eventEmitter.on('user.transcription.completed', (event: any) => {
      if (event.item?.input_audio_transcription?.transcript) {
        client.emit('user-transcription', {
          sessionId,
          text: event.item.input_audio_transcription.transcript,
          timestamp: Date.now(),
        });
      }
    });

    // Respuesta de audio del asistente (chunks)
    eventEmitter.on('assistant.audio.delta', (event: any) => {
      if (event.delta) {
        client.emit('assistant-audio-chunk', {
          sessionId,
          audio: event.delta, // Base64 encoded audio
          timestamp: Date.now(),
        });
      }
    });

    // Transcripción de la respuesta del asistente
    eventEmitter.on('assistant.transcript.delta', (event: any) => {
      if (event.delta) {
        client.emit('assistant-transcript-delta', {
          sessionId,
          text: event.delta,
          timestamp: Date.now(),
        });
      }
    });

    eventEmitter.on('assistant.transcript.done', (event: any) => {
      if (event.transcript) {
        client.emit('assistant-transcript-complete', {
          sessionId,
          text: event.transcript,
          timestamp: Date.now(),
        });
      }
    });

    // Respuesta completa del asistente
    eventEmitter.on('assistant.response.done', () => {
      client.emit('assistant-response-complete', {
        sessionId,
        timestamp: Date.now(),
      });
    });

    // Errores
    eventEmitter.on('error', (error: any) => {
      this.logger.error(`Error in session ${sessionId}:`, error);
      client.emit('error', {
        type: 'realtime-error',
        message: error.message || 'Unknown error',
        sessionId,
        timestamp: Date.now(),
      });
    });

    // Conexión/desconexión
    eventEmitter.on('connected', () => {
      client.emit('realtime-connected', { sessionId, timestamp: Date.now() });
    });

    eventEmitter.on('disconnected', () => {
      client.emit('realtime-disconnected', {
        sessionId,
        timestamp: Date.now(),
      });
    });
  }

  @SubscribeMessage('audio-chunk')
  handleAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AudioChunkPayload,
  ): void {
    try {
      const sessionId = payload.sessionId;
      const session = this.realtimeService.getSession(sessionId);

      if (!session || session.status !== 'connected') {
        client.emit('error', {
          type: 'session-not-connected',
          message: 'Session not connected',
          sessionId,
          timestamp: Date.now(),
        });
        return;
      }

      // Decodificar audio base64 y enviar a OpenAI Realtime
      const audioBuffer = Buffer.from(payload.audio, 'base64');
      this.realtimeService.sendAudio(sessionId, audioBuffer);

      // Confirmar recepción (opcional)
      client.emit('audio-chunk-received', {
        sessionId,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error(
        `Error handling audio chunk in session ${payload.sessionId}:`,
        error,
      );
      client.emit('error', {
        type: 'audio-chunk-error',
        message: (error as Error).message,
        sessionId: payload.sessionId,
        timestamp: Date.now(),
      });
    }
  }

  @SubscribeMessage('stop-practice')
  async handleStopPractice(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ): Promise<{ status: 'stopped' }> {
    try {
      await this.realtimeService.closeSession(payload.sessionId);
      this.sessionToSocketMap.delete(payload.sessionId);
      this.socketToSessionMap.delete(client.id);

      client.emit('practice-stopped', {
        sessionId: payload.sessionId,
        timestamp: Date.now(),
      });

      return { status: 'stopped' };
    } catch (error) {
      this.logger.error(
        `Error stopping practice session ${payload.sessionId}:`,
        error,
      );
      throw error;
    }
  }

  @SubscribeMessage('interrupt')
  handleInterrupt(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ): void {
    try {
      // Cuando el usuario interrumpe, descartar el buffer de audio del asistente
      // y detener la respuesta actual
      this.realtimeService.discardAudio(payload.sessionId);

      // Enviar evento de interrupción a OpenAI para que detenga su respuesta
      const session = this.realtimeService.getSession(payload.sessionId);
      if (session?.ws && session.status === 'connected') {
        session.ws.send(
          JSON.stringify({
            type: 'response.cancel',
          }),
        );
      }

      client.emit('interrupted', {
        sessionId: payload.sessionId,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error(
        `Error interrupting session ${payload.sessionId}:`,
        error,
      );
    }
  }
}

