import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import * as WebSocket from 'ws';
import type { Data } from 'ws';
import { EventEmitter } from 'events';

export type Language = 'english' | 'spanish';

export type ConversationRole = 'system' | 'user' | 'assistant';

export interface ConversationItem {
  role: ConversationRole;
  content: string;
}

export type RealtimeEventType =
  | 'session.created'
  | 'session.updated'
  | 'session.cleared'
  | 'input_audio_buffer.speech_started'
  | 'input_audio_buffer.speech_stopped'
  | 'input_audio_buffer.committed'
  | 'input_audio_buffer.discarded'
  | 'conversation.item.input_audio_transcription.completed'
  | 'conversation.item.input_audio_transcription.failed'
  | 'response.created'
  | 'response.audio_transcript.delta'
  | 'response.audio_transcript.done'
  | 'response.audio.delta'
  | 'response.audio.done'
  | 'response.content.done'
  | 'response.done'
  | 'response.function_call_arguments.done'
  | 'error';

export interface RealtimeEvent {
  type: RealtimeEventType;
  event_id?: string;
  [key: string]: unknown;
}

export interface RealtimeSessionConfig {
  language: Language;
  userId: string;
  sessionId: string;
  level?: string;
  temperature?: number;
  voice?: string;
  systemPrompt?: string;
  mode?: 'practice' | 'test'; // 'practice' = práctica libre, 'test' = test CEFR
}

export interface RealtimeSession {
  id: string;
  ws: WebSocket | null;
  config: RealtimeSessionConfig;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  eventEmitter: EventEmitter;
}

@Injectable()
export class OpenAIRealtimeService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(OpenAIRealtimeService.name);
  private readonly sessions = new Map<string, RealtimeSession>();
  private readonly defaultVoiceByLanguage: Record<Language, string> = {
    english: process.env.OPENAI_VOICE_ENGLISH ?? 'alloy',
    spanish: process.env.OPENAI_VOICE_SPANISH ?? 'nova',
  };

  private readonly defaultSystemPrompts: Record<Language, string> = {
    english:
      'You are a helpful English language practice tutor. Speak naturally and help the user practice English conversation. Provide corrections and feedback when appropriate, but keep the conversation flowing.',
    spanish:
      'Eres un tutor de práctica de español amigable. Habla de forma natural y ayuda al usuario a practicar conversación en español. Proporciona correcciones y retroalimentación cuando sea apropiado, pero mantén la conversación fluyendo.',
  };

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Crea una nueva sesión de Realtime API y conecta el WebSocket
   */
  async createSession(config: RealtimeSessionConfig): Promise<RealtimeSession> {
    if (this.sessions.has(config.sessionId)) {
      throw new Error(`Session ${config.sessionId} already exists`);
    }

    const eventEmitter = new EventEmitter();
    const session: RealtimeSession = {
      id: config.sessionId,
      ws: null,
      config,
      status: 'connecting',
      eventEmitter,
    };

    try {
      // Conectar directamente a OpenAI Realtime API via WebSocket
      // No necesitamos crear sesión primero, la API maneja esto automáticamente
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      const wsUrl = `wss://api.openai.com/v1/realtime?model=${model}`;

      // Conectar WebSocket
      const ws = new WebSocket(wsUrl, {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      session.ws = ws;
      this.setupWebSocketHandlers(session, eventEmitter);
      this.sessions.set(config.sessionId, session);

      // La sesión se configurará automáticamente cuando el WebSocket se abra
      // (manejado en setupWebSocketHandlers)

      return session;
    } catch (error) {
      this.logger.error(`Error creating session ${config.sessionId}:`, error);
      session.status = 'error';
      throw error;
    }
  }

  /**
   * Configura los handlers del WebSocket y maneja eventos de OpenAI
   */
  private setupWebSocketHandlers(
    session: RealtimeSession,
    eventEmitter: EventEmitter,
  ): void {
    const ws = session.ws;
    if (!ws) return;

    ws.on('open', () => {
      this.logger.log(`WebSocket connected for session ${session.id}`);
      session.status = 'connected';
      eventEmitter.emit('connected');
      
      // Una vez conectado, configurar la sesión
      this.configureSession(session);
      
      // Esperar a que la sesión se actualice para crear el saludo inicial
      const sessionUpdatedHandler = () => {
        setTimeout(() => {
          this.createInitialResponse(session);
          eventEmitter.removeListener('session.updated', sessionUpdatedHandler);
        }, 300);
      };
      eventEmitter.once('session.updated', sessionUpdatedHandler);
    });

    ws.on('message', (data: Data) => {
      try {
        const event: RealtimeEvent = JSON.parse(data.toString());
        this.handleRealtimeEvent(session, event, eventEmitter);
      } catch (error) {
        this.logger.error(
          `Error parsing message in session ${session.id}:`,
          error,
        );
      }
    });

    ws.on('error', (error) => {
      this.logger.error(
        `WebSocket error in session ${session.id}:`,
        error,
      );
      session.status = 'error';
      eventEmitter.emit('error', error);
    });

    ws.on('close', () => {
      this.logger.log(`WebSocket closed for session ${session.id}`);
      session.status = 'disconnected';
      eventEmitter.emit('disconnected');
    });
  }

  /**
   * Configura la sesión con los parámetros iniciales
   */
  private configureSession(session: RealtimeSession): void {
    const voice =
      session.config.voice ||
      this.defaultVoiceByLanguage[session.config.language];

    // Log the session configuration for debugging
    this.logger.log(`🔧 Configuring session ${session.id} with mode: ${session.config.mode}, language: ${session.config.language}`);

    // Determinar el prompt del sistema según el modo
    let systemPrompt: string;
    if (session.config.mode === 'test') {
      // Modo test CEFR: evaluación formal
      if (session.config.language === 'english') {
        systemPrompt = `You are Maria, a professional CEFR (Common European Framework of Reference) language assessor conducting a formal English placement test. 

IMPORTANT: When the conversation begins, you must greet the user first. Say: "Hello! Welcome to your placement test. I'm Maria, your assessor. Let's begin with a few questions to determine your English level. Please introduce yourself briefly and tell me a little about your background."

Your role is to:
- Start by greeting the user (this is your first message)
- Ask structured questions that progressively increase in difficulty
- Evaluate the user's responses across four dimensions: grammar, pronunciation, vocabulary, and fluency
- Provide clear, specific questions that help determine the user's CEFR level (A1, A2, B1, B2, C1, C2)
- Keep the test focused and efficient
- After each response, provide brief, constructive feedback
- Do not engage in casual conversation - this is a formal assessment`;
      } else {
        systemPrompt = `Eres Maria, una evaluadora profesional de CEFR (Marco Común Europeo de Referencia) realizando un examen de nivelación formal de español.

IMPORTANTE: Cuando comience la conversación, debes saludar al usuario primero. Di: "¡Hola! Bienvenido a tu examen de nivelación. Soy María, tu evaluadora. Comencemos con algunas preguntas para determinar tu nivel de español. Por favor preséntate brevemente y cuéntame un poco sobre tu experiencia."

Tu rol es:
- Comenzar saludando al usuario (este es tu primer mensaje)
- Hacer preguntas estructuradas que aumenten progresivamente en dificultad
- Evaluar las respuestas del usuario en cuatro dimensiones: gramática, pronunciación, vocabulario y fluidez
- Proporcionar preguntas claras y específicas que ayuden a determinar el nivel CEFR del usuario (A1, A2, B1, B2, C1, C2)
- Mantener el examen enfocado y eficiente
- Después de cada respuesta, proporcionar retroalimentación breve y constructiva
- No entablar conversación casual - esto es una evaluación formal`;
      }
    } else {
      // Modo práctica libre: conversación natural con saludo inicial
      if (session.config.language === 'english') {
        systemPrompt = `You are a helpful English language practice tutor. 

IMPORTANT: When the conversation begins, you must greet the user first. Say: "Hello! I'm here to help you practice English. Let's have a natural conversation. Feel free to talk about anything you'd like, and I'll help you improve along the way. What would you like to talk about today?"

Speak naturally and help the user practice English conversation. Provide corrections and feedback when appropriate, but keep the conversation flowing.`;
      } else {
        systemPrompt = `Eres un tutor de práctica de español amigable.

IMPORTANTE: Cuando comience la conversación, debes saludar al usuario primero. Di: "¡Hola! Estoy aquí para ayudarte a practicar español. Tengamos una conversación natural. Siéntete libre de hablar sobre lo que quieras, y te ayudaré a mejorar en el camino. ¿Sobre qué te gustaría hablar hoy?"

Habla de forma natural y ayuda al usuario a practicar conversación en español. Proporciona correcciones y retroalimentación cuando sea apropiado, pero mantén la conversación fluyendo.`;
      }
    }

    // Log the final system prompt for debugging
    this.logger.log(`📝 System prompt for session ${session.id} (mode: ${session.config.mode}): ${systemPrompt.substring(0, 200)}...`);

    // Enviar configuración inicial
    this.sendEvent(session.id, {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: systemPrompt,
        voice: voice,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        temperature: session.config.temperature ?? (session.config.mode === 'test' ? 0.7 : 0.8),
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        tools: [
          {
            type: 'function',
            name: 'end_conversation',
            description:
              'Call this when the conversation should end naturally.',
            parameters: {
              type: 'object',
              properties: {},
            },
          },
        ],
        tool_choice: 'auto',
      },
    });

    // La respuesta inicial se creará cuando se reciba el evento session.updated
    // (configurado en el handler del evento 'open')
  }

  /**
   * Crea una respuesta inicial para que el asistente salude al usuario
   * El prompt del sistema ya incluye instrucciones para saludar primero
   */
  private createInitialResponse(session: RealtimeSession): void {
    // Crear una respuesta inicial vacía que activará el saludo del asistente
    // El prompt del sistema ya tiene las instrucciones para saludar primero
    this.logger.log(`Creating initial response for session ${session.id}`);
    
    this.sendEvent(session.id, {
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
      },
    });
  }

  /**
   * Maneja eventos recibidos de OpenAI Realtime API
   */
  private handleRealtimeEvent(
    session: RealtimeSession,
    event: RealtimeEvent,
    eventEmitter: EventEmitter,
  ): void {
    switch (event.type) {
      case 'session.created':
      case 'session.updated':
        eventEmitter.emit('session.updated', event);
        break;

      case 'input_audio_buffer.speech_started':
        eventEmitter.emit('user.speech.started', event);
        break;

      case 'input_audio_buffer.speech_stopped':
        eventEmitter.emit('user.speech.stopped', event);
        break;

      case 'input_audio_buffer.committed':
        eventEmitter.emit('user.audio.committed', event);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        this.logger.log(
          `User transcription completed in session ${session.id}`,
        );
        eventEmitter.emit('user.transcription.completed', event);
        break;

      case 'response.audio_transcript.delta':
        eventEmitter.emit('assistant.transcript.delta', event);
        break;

      case 'response.audio_transcript.done':
        eventEmitter.emit('assistant.transcript.done', event);
        break;

      case 'response.audio.delta':
        eventEmitter.emit('assistant.audio.delta', event);
        break;

      case 'response.audio.done':
        eventEmitter.emit('assistant.audio.done', event);
        break;

      case 'response.created':
        this.logger.log(
          `Assistant response created in session ${session.id}`,
        );
        eventEmitter.emit('assistant.response.created', event);
        break;

      case 'response.done':
        this.logger.log(
          `Assistant response done in session ${session.id}`,
        );
        eventEmitter.emit('assistant.response.done', event);
        break;

      case 'error':
        this.logger.error(
          `OpenAI Realtime error in session ${session.id}:`,
          event,
        );
        eventEmitter.emit('error', event);
        break;

      default:
        // Silently ignore unhandled events
        break;
    }
  }

  /**
   * Envía audio del usuario a OpenAI Realtime API
   */
  sendAudio(
    sessionId: string,
    audioData: ArrayBuffer | Buffer | Uint8Array,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.ws || session.status !== 'connected') {
      throw new Error(
        `Session ${sessionId} not found or not connected`,
      );
    }

    // Convertir audio a Buffer si es necesario y luego a base64
    let audioBuffer: Buffer;
    if (Buffer.isBuffer(audioData)) {
      audioBuffer = audioData;
    } else if (audioData instanceof ArrayBuffer) {
      audioBuffer = Buffer.from(new Uint8Array(audioData));
    } else if (audioData instanceof Uint8Array) {
      audioBuffer = Buffer.from(audioData);
    } else {
      throw new Error('Unsupported audio data type');
    }

    if (audioBuffer.length === 0) {
      return;
    }

    const base64Audio = audioBuffer.toString('base64');

    this.sendEvent(sessionId, {
      type: 'input_audio_buffer.append',
      audio: base64Audio,
    });
  }

  /**
   * Confirma que el usuario terminó de hablar (commit audio buffer)
   */
  commitAudio(sessionId: string): void {
    this.sendEvent(sessionId, {
      type: 'input_audio_buffer.commit',
    });
  }

  /**
   * Descarta el buffer de audio actual
   */
  discardAudio(sessionId: string): void {
    this.sendEvent(sessionId, {
      type: 'input_audio_buffer.discard',
    });
  }

  /**
   * Envía un evento a OpenAI Realtime API
   */
  private sendEvent(sessionId: string, event: Record<string, unknown>): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.ws || session.status !== 'connected') {
      return;
    }

    try {
      session.ws.send(JSON.stringify(event));
    } catch (error) {
      this.logger.error(
        `Error sending event to session ${sessionId}:`,
        error,
      );
    }
  }

  /**
   * Obtiene la sesión y su EventEmitter para escuchar eventos
   */
  getSession(sessionId: string): RealtimeSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Cierra y elimina una sesión
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    if (session.ws) {
      session.ws.close();
    }

    this.sessions.delete(sessionId);
    this.logger.log(`Session ${sessionId} closed and removed`);
  }

  /**
   * Obtiene el EventEmitter de una sesión para escuchar eventos
   */
  getEventEmitter(sessionId: string): EventEmitter | undefined {
    const session = this.sessions.get(sessionId);
    return session?.eventEmitter;
  }

  /**
   * Método legacy para compatibilidad con código existente
   * Usa el endpoint de streaming de OpenAI (no Realtime API)
   * @deprecated Use createSession y WebSocket para práctica en tiempo real
   */
  async streamResponse(
    conversation: ConversationItem[],
    options: {
      language: Language;
      voice?: string;
      temperature?: number;
      maxOutputTokens?: number;
    },
  ): Promise<
    AsyncIterable<{
      type: string;
      delta?: string;
      [key: string]: unknown;
    }> & {
      finalResponse?: () => Promise<unknown>;
    }
  > {
    const voice =
      options.voice ?? this.defaultVoiceByLanguage[options.language] ?? 'alloy';
    const model = process.env.OPENAI_REALTIME_MODEL ?? 'gpt-4o-realtime-preview';

    const input = conversation.map(
      (message) =>
        ({
          role: message.role,
          content: [
            {
              type: 'input_text',
              text: message.content,
            },
          ],
        }) satisfies OpenAI.Responses.ResponseInput[number],
    ) as OpenAI.Responses.ResponseInput;

    try {
      const stream = await this.openai.responses.stream({
        model,
        input,
        temperature: options.temperature ?? 0.7,
        max_output_tokens: options.maxOutputTokens ?? 500,
        modalities: ['text', 'audio'],
        audio: {
          voice,
          format: 'mp3',
        },
      });

      // Mapear eventos del stream a un formato compatible
      return this.mapStreamToLegacyFormat(stream);
    } catch (error) {
      this.logger.error('Error creating OpenAI stream', error as Error);
      throw error;
    }
  }

  /**
   * Mapea el stream de OpenAI Responses API al formato legacy esperado
   */
  private async *mapStreamToLegacyFormat(
    stream: AsyncIterable<unknown>,
  ): AsyncIterable<{
    type: string;
    delta?: string;
    [key: string]: unknown;
  }> {
    for await (const event of stream) {
      const eventObj = event as { type?: string; delta?: string; [key: string]: unknown };
      
      // Mapear eventos del nuevo formato al formato legacy
      if (eventObj.type === 'response.output_text.delta') {
        yield {
          type: 'response.output_text.delta',
          delta: eventObj.delta,
        };
      } else if (eventObj.type === 'response.audio.delta') {
        yield {
          type: 'response.audio.delta',
          delta: eventObj.delta,
        };
      } else if (eventObj.type === 'response.error') {
        yield {
          type: 'response.error',
          ...eventObj,
        };
      } else {
        // Pasar otros eventos tal cual, asegurando que siempre tenga type
        yield {
          type: eventObj.type ?? 'unknown',
          ...eventObj,
        };
      }
    }
  }
}
