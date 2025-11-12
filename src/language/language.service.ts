import {
  ConflictException,
  Injectable,
  Logger,
  MessageEvent,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subject, Observable } from 'rxjs';
import {
  User,
  UserDocument,
  Language,
  CefrLevel,
  LanguageTest,
  PracticeSession,
} from '../schemas/user.schema';
import { CreateLanguageTestDto } from './dto/create-language-test.dto';
import { StartPracticeSessionDto } from './dto/start-practice-session.dto';
import { CompletePracticeSessionDto } from './dto/complete-practice-session.dto';
import {
  LanguageAnalyticsService,
  PracticeAnalyticsResult,
  PracticeFeedbackAggregate,
} from './language-analytics.service';
import type { LanguageGateway } from './language.gateway';
import {
  ConversationItem,
  OpenAIRealtimeService,
} from '../openai/openai-realtime.service';

export type RealtimeEvent =
  | {
      type: 'session.started';
      payload: { sessionId: string; userId: string; language: Language };
      timestamp: number;
    }
  | {
      type: 'session.event';
      payload: {
        sessionId: string;
        role: 'user' | 'assistant';
        text: string;
        isFinal?: boolean;
        timestamp: number;
      };
      timestamp: number;
    }
  | {
      type: 'assistant.message';
      payload: {
        sessionId: string;
        text: string;
        delta?: string;
        isFinal?: boolean;
        audioUrl?: string;
        metadata?: Record<string, unknown>;
      };
      timestamp: number;
    }
  | {
      type: 'session.completed';
      payload: PracticeAnalyticsResult['metrics'];
      timestamp: number;
    };

@Injectable()
export class LanguageService {
  private readonly logger = new Logger(LanguageService.name);
  private readonly sessionStreams = new Map<string, Subject<MessageEvent>>();
  private gateway?: LanguageGateway;
  private readonly conversationStates = new Map<
    string,
    {
      userId: string;
      language: Language;
      level: CefrLevel;
      messages: ConversationItem[];
      voice?: string;
      processing: boolean;
    }
  >();

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly analyticsService: LanguageAnalyticsService,
    private readonly realtimeService: OpenAIRealtimeService,
  ) {}

  registerGateway(gateway: LanguageGateway): void {
    this.gateway = gateway;
  }

  async createLanguageTest(
    userId: string,
    dto: CreateLanguageTestDto,
  ): Promise<LanguageTest> {
    const user = await this.ensureUser(userId);
    const allowRetake = dto.allowRetake ?? false;
    const existingTest = user.languageTests?.get(dto.language);

    if (existingTest && !allowRetake) {
      throw new ConflictException(
        `Ya existe un test para el idioma ${dto.language}. Usa allowRetake para reemplazarlo.`,
      );
    }

    const breakdown: LanguageTest['breakdown'] = {
      grammar: dto.breakdown.grammar,
      pronunciation: dto.breakdown.pronunciation,
      vocabulary: dto.breakdown.vocabulary,
      fluency: dto.breakdown.fluency,
      listening: dto.breakdown.listening,
      reading: dto.breakdown.reading,
    };

    const metadata = dto.metadata
      ? {
          promptSeed: dto.metadata.promptSeed,
          aiModel: dto.metadata.aiModel,
          durationSeconds: dto.metadata.durationSeconds,
          notes: dto.metadata.notes,
          attachments: dto.metadata.attachments?.map((item) => ({
            url: item.url,
            kind: item.kind,
          })),
        }
      : undefined;

    const languageTest: LanguageTest = {
      language: dto.language,
      date: new Date(dto.date),
      level: dto.level,
      score: dto.score,
      breakdown,
      metadata,
    };

    if (!user.languageTests) {
      user.languageTests = new Map() as unknown as typeof user.languageTests;
    }

    user.languageTests.set(dto.language, languageTest as any);
    user.markModified('languageTests');

    this.upsertCurrentLevel(user, dto.language, dto.level, 'test');

    await user.save();
    return languageTest;
  }

  async startPracticeSession(
    userId: string,
    dto: StartPracticeSessionDto,
  ): Promise<PracticeSession> {
    const user = await this.ensureUser(userId);
    const sessionId = new Types.ObjectId();
    const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();
    const feedback =
      this.analyticsService.createInitialFeedback(dto.language, dto.level);

    const session: PracticeSession = {
      _id: sessionId as any,
      startedAt,
      language: dto.language,
      level: dto.level,
      durationSeconds: 0,
      topics: dto.topics ?? [],
      pronunciation: feedback.pronunciation,
      grammar: feedback.grammar,
      vocabulary: feedback.vocabulary,
      fluency: feedback.fluency,
      completed: false,
      conversationLog: {
        transcript: [],
        audioUrls: [],
      },
    };

    user.practiceSessions ??= [];
    user.practiceSessions.push(session as any);
    user.markModified('practiceSessions');
    await user.save();

    const sessionKey = sessionId.toString();

    this.conversationStates.set(sessionKey, {
      userId,
      language: dto.language,
      level: dto.level,
      voice: dto.aiPersona,
      processing: false,
      messages: [
        {
          role: 'system',
          content: this.buildSystemPrompt(dto.language, dto.level, dto),
        },
      ],
    });

    const payload: RealtimeEvent = {
      type: 'session.started',
      payload: {
        sessionId: sessionKey,
        userId,
        language: dto.language,
      },
      timestamp: Date.now(),
    };

    this.emitRealtimeEvent(sessionKey, payload);
    return session;
  }

  async handleUserTranscript(
    userId: string,
    sessionId: string,
    text: string,
    isFinal?: boolean,
    timestamp?: number,
  ): Promise<void> {
    const state = this.conversationStates.get(sessionId);
    if (!state) {
      this.logger.warn(
        `No se encontró estado conversacional para la sesión ${sessionId}`,
      );
      return;
    }

    if (state.userId !== userId) {
      this.logger.warn(
        `Usuario ${userId} intentó publicar en sesión ${sessionId} que pertenece a ${state.userId}`,
      );
      return;
    }

    if (state.processing) {
      this.logger.warn(
        `Sesión ${sessionId} aún procesando respuesta anterior, ignorando nueva transcripción`,
      );
      return;
    }

    state.messages.push({
      role: 'user',
      content: text,
    });

    this.emitRealtimeEvent(sessionId, {
      type: 'session.event',
      payload: {
        sessionId,
        role: 'user',
        text,
        isFinal,
        timestamp: timestamp ?? Date.now(),
      },
      timestamp: Date.now(),
    });

    state.processing = true;
    const audioChunks: string[] = [];
    let assistantText = '';

    try {
      const stream = await this.realtimeService.streamResponse(state.messages, {
        language: state.language,
        voice: state.voice,
      });

      for await (const event of stream) {
        switch (event.type) {
          case 'response.output_text.delta': {
            const delta = String(event.delta ?? '');
            if (delta.length === 0) break;
            assistantText += delta;
            this.emitRealtimeEvent(sessionId, {
              type: 'assistant.message',
              payload: {
                sessionId,
                text: assistantText,
                delta,
                isFinal: false,
              },
              timestamp: Date.now(),
            });
            break;
          }
          case 'response.audio.delta': {
            const chunk = String(event.delta ?? '');
            if (chunk) {
              audioChunks.push(chunk);
            }
            break;
          }
          case 'response.error': {
            this.logger.error(
              `Error de stream OpenAI en sesión ${sessionId}: ${JSON.stringify(
                event,
              )}`,
            );
            break;
          }
          default:
            break;
        }
      }

      if (typeof (stream as any).finalResponse === 'function') {
        try {
          await (stream as any).finalResponse();
        } catch (error) {
          this.logger.warn(
            `No se pudo obtener finalResponse para sesión ${sessionId}`,
            error as Error,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error generando respuesta para sesión ${sessionId}`,
        error as Error,
      );
      this.emitRealtimeEvent(sessionId, {
        type: 'assistant.message',
        payload: {
          sessionId,
          text: 'Lo siento, hubo un problema generando la respuesta.',
          isFinal: true,
        },
        timestamp: Date.now(),
      });
      state.processing = false;
      return;
    }

    const finalText = assistantText.trim();
    if (finalText.length > 0) {
      state.messages.push({
        role: 'assistant',
        content: finalText,
      });
    }

    const audioUrl =
      audioChunks.length > 0
        ? `data:audio/mp3;base64,${audioChunks.join('')}`
        : undefined;

    this.emitRealtimeEvent(sessionId, {
      type: 'assistant.message',
      payload: {
        sessionId,
        text: finalText,
        audioUrl,
        isFinal: true,
      },
      timestamp: Date.now(),
    });

    state.processing = false;
  }

  async completePracticeSession(
    userId: string,
    sessionId: string,
    dto: CompletePracticeSessionDto,
  ): Promise<PracticeSession> {
    const user = await this.ensureUser(userId);

    const session = (user.practiceSessions ?? []).find((item: any) =>
      this.isSameObjectId(item._id, sessionId),
    );

    if (!session) {
      throw new NotFoundException('Sesión de práctica no encontrada');
    }

    const analytics = this.analyticsService.analyzeCompletion(dto);
    this.applyPracticeFeedback(session, dto, analytics.feedback);

    session.language = dto.language;
    session.level = dto.level;
    session.endedAt = new Date(dto.endedAt);
    session.durationSeconds =
      dto.durationSeconds ??
      Math.max(
        0,
        Math.round(
          (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
        ),
      );
    session.completed = true;

    if (analytics.conversationLog) {
      session.conversationLog = analytics.conversationLog as any;
    }

    this.upsertCurrentLevel(
      user,
      dto.language,
      analytics.metrics.recommendedLevel,
      'practice',
    );

    user.markModified('practiceSessions');
    user.markModified('currentLevels');
    await user.save();

    const completionEvent: RealtimeEvent = {
      type: 'session.completed',
      payload: analytics.metrics,
      timestamp: Date.now(),
    };

    this.emitRealtimeEvent(sessionId, completionEvent);
    this.completeRealtimeStream(sessionId);
    this.conversationStates.delete(sessionId);
    return session;
  }

  getSessionStream(sessionId: string): Observable<MessageEvent> {
    const stream = this.ensureStream(sessionId);
    return stream.asObservable();
  }

  emitRealtimeEvent(sessionId: string, event: RealtimeEvent): void {
    const stream = this.ensureStream(sessionId);
    const messageEvent: MessageEvent = {
      data: event,
    };
    stream.next(messageEvent);
    this.gateway?.dispatchSessionEvent(sessionId, event);
  }

  completeRealtimeStream(sessionId: string): void {
    const stream = this.sessionStreams.get(sessionId);
    if (stream) {
      stream.complete();
      this.sessionStreams.delete(sessionId);
    }
  }

  private ensureStream(sessionId: string): Subject<MessageEvent> {
    if (!this.sessionStreams.has(sessionId)) {
      this.sessionStreams.set(sessionId, new Subject<MessageEvent>());
    }
    return this.sessionStreams.get(sessionId)!;
  }

  private applyPracticeFeedback(
    session: PracticeSession,
    dto: CompletePracticeSessionDto,
    feedback: PracticeFeedbackAggregate,
  ): void {
    session.pronunciation = feedback.pronunciation as any;
    session.grammar = feedback.grammar as any;
    session.vocabulary = feedback.vocabulary as any;
    session.fluency = feedback.fluency as any;

    if (dto.conversationLog?.transcript?.length) {
      session.conversationLog ??= { transcript: [], audioUrls: [] };
      session.conversationLog.transcript = dto.conversationLog.transcript.map(
        (item) => ({
          ...item,
        }),
      );
    }

    if (dto.conversationLog?.audioUrls?.length) {
      session.conversationLog ??= { transcript: [], audioUrls: [] };
      session.conversationLog.audioUrls = dto.conversationLog.audioUrls.map(
        (item) => ({ ...item }),
      );
    }
  }

  private upsertCurrentLevel(
    user: UserDocument,
    language: Language,
    level: CefrLevel,
    source: 'test' | 'practice' | 'manual',
  ): void {
    if (!user.currentLevels) {
      user.currentLevels = new Map() as any;
    }
    user.currentLevels.set(language, {
      level,
      lastUpdated: new Date(),
      source,
    });
  }

  private buildSystemPrompt(
    language: Language,
    level: CefrLevel,
    dto: StartPracticeSessionDto,
  ): string {
    const topics =
      dto.topics && dto.topics.length > 0
        ? dto.topics.join(', ')
        : language === 'english'
        ? 'daily life, work and technology'
        : 'situaciones cotidianas, trabajo y tecnología';
    const goal = dto.goal
      ? (language === 'english'
          ? `Specific goal: ${dto.goal}.`
          : `Objetivo específico: ${dto.goal}.`)
      : language === 'english'
      ? 'Keep the dialogue flowing naturally.'
      : 'Mantén la conversación fluida y natural.';

    if (language === 'english') {
      return [
        'You are a friendly English-speaking tutor holding a live conversation.',
        `Adjust vocabulary and grammar to CEFR level ${level}.`,
        `Focus on topics such as ${topics}.`,
        'Speak naturally like a human partner, keep answers to 2-3 sentences, and always end with a follow-up question.',
        goal,
      ].join(' ');
    }

    return [
      'Eres un tutor hispanohablante conversando en tiempo real con el estudiante.',
      `Adapta el vocabulario y la gramática al nivel CEFR ${level}.`,
      `Mantén la conversación en torno a estos temas: ${topics}.`,
      'Habla con naturalidad como un nativo, responde en 2-3 oraciones y termina con una pregunta para continuar.',
      goal,
    ].join(' ');
  }

  private async ensureUser(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  private isSameObjectId(
    value: Types.ObjectId | string,
    comparison: string,
  ): boolean {
    if (!value) return false;
    const current =
      value instanceof Types.ObjectId ? value.toHexString() : String(value);
    return current === comparison;
  }
}

