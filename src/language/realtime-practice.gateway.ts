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
import { JwtWebSocketGuard } from '../auth/jwt-websocket.guard';
import { OpenAIRealtimeService } from '../openai/openai-realtime.service';
import { JwtService } from '../auth/jwt.service';
import { EventEmitter } from 'events';
import { Language } from '../schemas/user.schema';
import { RedisStorageService } from './redis-storage.service';

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

@UseGuards(JwtWebSocketGuard)
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
  private readonly userAudioChunks = new Map<string, string[]>(); // sessionId -> audio chunks

  constructor(
    private readonly realtimeService: OpenAIRealtimeService,
    private readonly jwtService: JwtService,
    private readonly redisStorage: RedisStorageService,
  ) {}

  afterInit(): void {
    this.logger.log('RealtimePracticeGateway initialized');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      // Validar token en la conexión
      const token = this.extractTokenFromHandshake(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} attempted connection without token`);
        client.emit('error', {
          type: 'authentication-error',
          message: 'Token no proporcionado',
          timestamp: Date.now(),
        });
        client.disconnect();
        return;
      }

      // Verificar token
      try {
        const payload = await this.jwtService.verifyToken(token);
        if (!payload) {
          throw new Error('Token inválido');
        }

        // Almacenar usuario en el socket
        client.data.user = payload;
        // El token JWT usa 'sub' para el userId (ver auth.service.ts generateToken)
        client.data.userId = payload.sub || payload.id || payload.userId;

        this.logger.log(`Client connected: ${client.id} (User: ${client.data.userId})`);
        client.emit('connected', { 
          clientId: client.id, 
          userId: client.data.userId,
          timestamp: Date.now() 
        });
      } catch (error) {
        this.logger.warn(`Client ${client.id} provided invalid token`);
        client.emit('error', {
          type: 'authentication-error',
          message: 'Token inválido',
          timestamp: Date.now(),
        });
        client.disconnect();
      }
    } catch (error) {
      this.logger.error(`Error in handleConnection: ${error}`);
      client.disconnect();
    }
  }

  /**
   * Extrae el token del handshake de Socket.IO
   */
  private extractTokenFromHandshake(client: Socket): string | undefined {
    // 1. Del query parameter
    if (client.handshake?.query?.token) {
      return Array.isArray(client.handshake.query.token)
        ? client.handshake.query.token[0]
        : client.handshake.query.token;
    }

    // 2. Del auth object
    if (client.handshake?.auth?.token) {
      return client.handshake.auth.token;
    }

    // 3. Del header Authorization
    if (client.handshake?.headers?.authorization) {
      const authHeader = client.handshake.headers.authorization;
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer') {
        return token;
      }
    }

    return undefined;
  }

  handleDisconnect(client: Socket): void {
    const sessionId = this.socketToSessionMap.get(client.id);
    if (sessionId) {
      this.logger.log(`Client ${client.id} disconnected from session ${sessionId}`);
      this.sessionToSocketMap.delete(sessionId);
      this.socketToSessionMap.delete(client.id);
      this.userAudioChunks.delete(sessionId); // Clean up audio chunks
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
      // Obtener userId del token autenticado (más seguro que del payload)
      const authenticatedUserId = client.data.userId || client.data.user?.sub || client.data.user?.id;
      if (!authenticatedUserId) {
        throw new Error('Usuario no autenticado');
      }

      // Convertir ambos a string para comparación flexible
      const tokenUserId = String(authenticatedUserId);
      const payloadUserId = payload.userId ? String(payload.userId) : null;

      // Si el payload incluye userId, validar que coincida con el token
      // Si no lo incluye, usar el del token directamente
      const finalUserId = payloadUserId && payloadUserId === tokenUserId 
        ? payloadUserId 
        : tokenUserId;

      // Log de advertencia si hay discrepancia (pero no fallar)
      if (payloadUserId && payloadUserId !== tokenUserId) {
        this.logger.warn(
          `UserId mismatch: token=${tokenUserId}, payload=${payloadUserId}. Using token userId.`,
        );
      }

      const mode = payload.mode || 'practice'; // Por defecto es práctica libre
      this.logger.log(
        `Starting ${mode} session ${payload.sessionId} for user ${finalUserId}`,
      );

      // Crear sesión de OpenAI Realtime con configuración según el modo
      const session = await this.realtimeService.createSession({
        sessionId: payload.sessionId,
        userId: finalUserId,
        language: payload.language,
        level: payload.level,
        mode, // Pasar el modo a la sesión
      });

      // Mapear socket a sesión
      this.sessionToSocketMap.set(payload.sessionId, client);
      this.socketToSessionMap.set(client.id, payload.sessionId);

      // Initialize Redis session for conversation storage
      await this.redisStorage.initializeSession(payload.sessionId);

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
    eventEmitter.on('user.transcription.completed', async (event: any) => {
      this.logger.log(`🎤 User transcription event received for session ${sessionId}`);
      this.logger.log(`   Event structure: ${JSON.stringify(Object.keys(event))}`);
      this.logger.log(`   Has item: ${!!event.item}`);
      this.logger.log(`   Has transcript: ${!!event.item?.input_audio_transcription?.transcript}`);
      
      if (event.item?.input_audio_transcription?.transcript) {
        const timestamp = Date.now();
        const transcript = event.item.input_audio_transcription.transcript;
        
        this.logger.log(`✅ User said: "${transcript}"`);
        
        client.emit('user-transcription', {
          sessionId,
          text: transcript,
          timestamp,
        });

        // Get accumulated audio chunks for this user message
        const audioChunks = this.userAudioChunks.get(sessionId) || [];
        const combinedAudio = audioChunks.join('');
        
        // Clear accumulated chunks after storing
        this.userAudioChunks.set(sessionId, []);

        // Store user transcription with audio in Redis
        try {
          await this.redisStorage.storeUserTranscription(sessionId, transcript, combinedAudio, timestamp);
          this.logger.log(`💾 Stored user message in Redis: "${transcript}" with ${combinedAudio.length} chars of audio`);
        } catch (error) {
          this.logger.error(`Failed to store user transcription in Redis for session ${sessionId}:`, error);
        }
      } else {
        this.logger.warn(`⚠️ User transcription event received but no transcript found`);
      }
    });

    // Respuesta de audio del asistente (chunks)
    eventEmitter.on('assistant.audio.delta', (event: any) => {
      // El evento de OpenAI puede tener el audio en event.delta o directamente en el evento
      const audioData = event.delta || event.audio || event;
      
      if (audioData && typeof audioData === 'string' && audioData.length > 0) {
        client.emit('assistant-audio-chunk', {
          sessionId,
          audio: audioData, // Base64 encoded audio
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

    eventEmitter.on('assistant.transcript.done', async (event: any) => {
      if (event.transcript) {
        const timestamp = Date.now();
        
        client.emit('assistant-transcript-complete', {
          sessionId,
          text: event.transcript,
          timestamp,
        });

        // Store assistant response in Redis
        try {
          await this.redisStorage.storeAssistantResponse(sessionId, event.transcript, '', timestamp);
        } catch (error) {
          this.logger.error(`Failed to store assistant response in Redis for session ${sessionId}:`, error);
        }
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
      // Validar payload
      if (!payload) {
        this.logger.error('Audio chunk payload is null or undefined');
        client.emit('error', {
          type: 'invalid-payload',
          message: 'Payload is required',
          timestamp: Date.now(),
        });
        return;
      }

      const sessionId = payload.sessionId;
      if (!sessionId) {
        this.logger.error('SessionId is missing in audio chunk payload');
        client.emit('error', {
          type: 'missing-session-id',
          message: 'SessionId is required',
          timestamp: Date.now(),
        });
        return;
      }

      const session = this.realtimeService.getSession(sessionId);

      if (!session || session.status !== 'connected') {
        this.logger.warn(
          `Audio chunk received but session ${sessionId} not connected. Session exists: ${!!session}, Status: ${session?.status || 'N/A'}`,
        );
        client.emit('error', {
          type: 'session-not-connected',
          message: 'Session not connected',
          sessionId,
          timestamp: Date.now(),
        });
        return;
      }

      // Validar que el audio no esté vacío
      if (!payload.audio || payload.audio.length === 0) {
        this.logger.warn(`Empty audio chunk received for session ${sessionId}`);
        return;
      }

      // Decodificar audio base64 y enviar a OpenAI Realtime
      try {
        const audioBuffer = Buffer.from(payload.audio, 'base64');
        
        this.realtimeService.sendAudio(sessionId, audioBuffer);

        // Accumulate user audio chunks for later analysis
        if (!this.userAudioChunks.has(sessionId)) {
          this.userAudioChunks.set(sessionId, []);
        }
        this.userAudioChunks.get(sessionId)!.push(payload.audio);

        // Confirmar recepción
        client.emit('audio-chunk-received', {
          sessionId,
          timestamp: Date.now(),
        });
      } catch (audioError) {
        this.logger.error(
          `Error processing audio buffer for session ${sessionId}:`,
          audioError,
        );
        client.emit('error', {
          type: 'audio-processing-error',
          message: (audioError as Error).message,
          sessionId,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      this.logger.error(
        `❌ Error handling audio chunk from client ${client.id}:`,
        error,
      );
      client.emit('error', {
        type: 'audio-chunk-error',
        message: (error as Error).message,
        sessionId: payload?.sessionId || 'unknown',
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
      this.userAudioChunks.delete(payload.sessionId); // Clean up audio chunks

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

