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
import { RedisStorageService } from './redis-storage.service';
import { CefrAnalysisService } from './cefr-analysis.service';
import { WhisperTranscriptionService } from './whisper-transcription.service';

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
    private readonly redisStorage: RedisStorageService,
    private readonly cefrAnalysis: CefrAnalysisService,
    private readonly whisperService: WhisperTranscriptionService,
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
        title: '',
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

    // Initialize practiceSessions if it doesn't exist
    user.practiceSessions ??= [];

    let session = (user.practiceSessions ?? []).find((item: any) =>
      this.isSameObjectId(item._id, sessionId),
    );

    // If session doesn't exist, create it (for cases where frontend creates sessionId)
    if (!session) {
      this.logger.log(`Session ${sessionId} not found, creating new session for completion`);
      
      const feedback = this.analyticsService.createInitialFeedback(dto.language, dto.level || 'A1');
      
      // Calculate proper start time - ensure it's a valid date
      const endTime = new Date(dto.endedAt);
      const durationMs = (dto.durationSeconds || 0) * 1000;
      const startTime = new Date(endTime.getTime() - durationMs);
      
      // Validate the calculated start time - if it's invalid, use a reasonable default
      const validStartTime = isNaN(startTime.getTime()) || startTime.getTime() < 0 
        ? new Date(endTime.getTime() - 300000) // Default to 5 minutes before end time
        : startTime;
      
      this.logger.log(`Creating session with startedAt: ${validStartTime.toISOString()}, endedAt: ${endTime.toISOString()}, duration: ${dto.durationSeconds}s`);
      
      session = {
        _id: sessionId as any,
        startedAt: validStartTime,
        language: dto.language,
        level: dto.level || 'A1',
        durationSeconds: 0,
        topics: [],
        pronunciation: feedback.pronunciation,
        grammar: feedback.grammar,
        vocabulary: feedback.vocabulary,
        fluency: feedback.fluency,
        completed: false,
        conversationLog: {
          title: '',
          transcript: [],
          audioUrls: [],
        },
      } as any;

      user.practiceSessions.push(session as any);
      user.markModified('practiceSessions');
    }

    // Retrieve conversation from Redis
    const messages = await this.redisStorage.getSessionMessages(sessionId);

    // Log first few messages for debugging
    messages.slice(0, 3).forEach((msg, index) => {
      this.logger.log(`📝 Message ${index + 1}: [${msg.role}] "${msg.text.substring(0, 50)}..." (length: ${msg.text.length})`);
    });

    // Determine if this is a CEFR test based on sessionId or mode
    const isCefrTest = sessionId.includes('cefr-test') || sessionId.includes('test');
    
    // Generate appropriate title (will be set later after we have messages)
    let conversationTitle = '';

    // Preserve the original level from DTO if provided, otherwise use session level
    const originalLevel = dto.level || session.level;
    this.logger.log(`🎯 Original level from DTO: ${dto.level}, Session level: ${session.level}, Using: ${originalLevel}`);

    session.endedAt = new Date(dto.endedAt);
    session.durationSeconds =
      dto.durationSeconds ??
      Math.max(
        0,
        Math.round(
          (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
        ),
      );

    let cefrAnalysisResult: any;
    let analytics: PracticeAnalyticsResult;
    let extractedLevel: CefrLevel | null = null;
    
    // Check if any assistant messages contain CEFR level evaluation
    const assistantMessages = messages.filter(msg => msg.role === 'assistant');
    for (const message of assistantMessages) {
      const level = this.cefrAnalysis.extractCefrLevelFromResponse(message.text);
      if (level) {
        extractedLevel = level;
        this.logger.log(`🎯 Extracted CEFR level from realtime response: ${level}`);
        break;
      }
    }
    
    if (isCefrTest && messages.length > 0) {
      
      // Extract user audio chunks for analysis (now from transcribed messages)
      const userAudioChunks = messages
        .filter(msg => msg.role === 'user' && msg.audioBase64)
        .map(msg => msg.audioBase64)
        .filter(audio => audio && audio.length > 0);
      
      this.logger.log(`📊 Extracted ${userAudioChunks.length} user audio chunks for analysis (total size: ${userAudioChunks.join('').length} base64 chars)`);

      try {
        cefrAnalysisResult = await this.cefrAnalysis.analyzeCefrLevel(
          dto.language,
          messages,
          session.durationSeconds,
        );

        // Use extracted level if available, otherwise use analysis result, otherwise preserve original
        const finalLevel = extractedLevel || cefrAnalysisResult.level || originalLevel;
        
        // Update analysis result with extracted level info
        cefrAnalysisResult.extractedLevel = extractedLevel;
        cefrAnalysisResult.audioSuppressed = !!extractedLevel; // Audio was suppressed if we found evaluation

        // Update session with CEFR analysis results
        session.level = finalLevel;
        session.pronunciation = cefrAnalysisResult.feedback.pronunciation as any;
        session.grammar = cefrAnalysisResult.feedback.grammar as any;
        session.vocabulary = cefrAnalysisResult.feedback.vocabulary as any;
        session.fluency = cefrAnalysisResult.feedback.fluency as any;

        this.logger.log(`CEFR analysis completed. Final level: ${finalLevel} (extracted: ${extractedLevel}, analyzed: ${cefrAnalysisResult.level}, original: ${originalLevel})`);
      } catch (error) {
        this.logger.error('Error during CEFR analysis:', error);
        // Keep original session data if analysis fails, but still use extracted level if available
        if (extractedLevel) {
          session.level = extractedLevel;
          this.logger.log(`Using extracted level ${extractedLevel} despite analysis failure`);
        } else {
          // Preserve the original level from DTO
          session.level = originalLevel;
          this.logger.log(`Preserving original level ${originalLevel} due to analysis failure`);
        }
      }
    } else if (messages.length > 0) {
      // For regular practice sessions with conversation data, also run CEFR analysis for better feedback
      try {
        cefrAnalysisResult = await this.cefrAnalysis.analyzeCefrLevel(
          dto.language,
          messages,
          session.durationSeconds,
        );

        // Update session with analysis results but don't change level for practice sessions
        session.pronunciation = cefrAnalysisResult.feedback.pronunciation as any;
        session.grammar = cefrAnalysisResult.feedback.grammar as any;
        session.vocabulary = cefrAnalysisResult.feedback.vocabulary as any;
        session.fluency = cefrAnalysisResult.feedback.fluency as any;

        this.logger.log(`Practice session analysis completed. Feedback updated.`);
      } catch (error) {
        this.logger.error('Error during practice session analysis:', error);
        // Fall back to DTO feedback if available
        if (dto.feedback) {
          analytics = this.analyticsService.analyzeCompletion(dto, extractedLevel);
          this.applyPracticeFeedback(session, dto, analytics.feedback);
        }
        // Preserve original level for practice sessions
        session.level = originalLevel;
      }
    } else {
      // No conversation data available, use DTO feedback if provided
      if (dto.feedback) {
        analytics = this.analyticsService.analyzeCompletion(dto, extractedLevel);
        this.applyPracticeFeedback(session, dto, analytics.feedback);
      }
      session.level = extractedLevel || originalLevel;
    }

    // Create analytics for completion event (use default if CEFR test)
    if (!analytics) {
      // For CEFR tests, we don't need to call analyzeCompletion since we already have the analysis
      // Just create a simple analytics result with the metrics
      if (cefrAnalysisResult) {
        analytics = {
          feedback: cefrAnalysisResult.feedback,
          metrics: {
            averageScore: (
              cefrAnalysisResult.feedback.pronunciation.score +
              cefrAnalysisResult.feedback.grammar.score +
              cefrAnalysisResult.feedback.vocabulary.score +
              cefrAnalysisResult.feedback.fluency.score
            ) / 4,
            recommendedLevel: cefrAnalysisResult.level,
            fluencyRatio: cefrAnalysisResult.feedback.fluency.wordsPerMinute / 150, // Normalize WPM to a ratio (150 WPM as baseline)
          },
        };
      } else {
        // Fallback: create analytics with default feedback
        const dtoWithLevel: CompletePracticeSessionDto = {
          ...dto,
          level: session.level || 'A1',
        };
        analytics = this.analyticsService.analyzeCompletion(dtoWithLevel);
      }
    }

    session.language = dto.language;
    session.completed = true;

    // Save conversation history
    this.logger.log(`💾 Saving conversation history with ${messages.length} messages`);
    
    // Filter out empty messages for cleaner storage
    const validMessages = messages.filter(msg => msg.text && msg.text.trim().length > 0);

    // Generate conversation title based on content
    conversationTitle = await this.generateConversationTitle(dto.language, isCefrTest, validMessages, userId);
    this.logger.log(`📝 Generated conversation title: "${conversationTitle}"`);

    if (validMessages.length > 0) {
      session.conversationLog = {
        title: conversationTitle || (isCefrTest 
          ? (dto.language === 'english' ? 'Placement Test' : 'Examen de Nivelación')
          : (dto.language === 'english' ? 'Practice Session' : 'Sesión de Práctica')),
        transcript: validMessages.map(msg => ({
          role: msg.role,
          text: msg.text,
          timestamp: msg.timestamp,
        })),
        audioUrls: [], // Audio URLs would be generated separately if needed
      } as any;
    } else {
      // Even if no messages, set the title
      session.conversationLog = {
        title: conversationTitle || (isCefrTest 
          ? (dto.language === 'english' ? 'Placement Test' : 'Examen de Nivelación')
          : (dto.language === 'english' ? 'Practice Session' : 'Sesión de Práctica')),
        transcript: [],
        audioUrls: [],
      } as any;
    }

    // Update user's current level and save test result if it's a CEFR test
    const finalLevel = extractedLevel || cefrAnalysisResult?.level || originalLevel;
    
    if (isCefrTest && cefrAnalysisResult) {
      // Save as official language test result
      if (!user.languageTests) {
        user.languageTests = new Map() as unknown as typeof user.languageTests;
      }

      const languageTest: LanguageTest = {
        language: dto.language,
        date: new Date(dto.endedAt),
        level: finalLevel,
        score: analytics.metrics.averageScore,
        breakdown: {
          grammar: cefrAnalysisResult.feedback.grammar.score,
          pronunciation: cefrAnalysisResult.feedback.pronunciation.score,
          vocabulary: cefrAnalysisResult.feedback.vocabulary.score,
          fluency: cefrAnalysisResult.feedback.fluency.score,
        },
        metadata: {
          aiModel: 'gpt-4o-realtime',
          durationSeconds: session.durationSeconds,
          notes: `CEFR evaluation completed. Extracted level: ${extractedLevel || 'N/A'}, Analyzed level: ${cefrAnalysisResult.level}, Original level: ${originalLevel}`,
          attachments: [], // Could add audio/transcript URLs here if needed
        },
      };

      user.languageTests.set(dto.language, languageTest as any);
      user.markModified('languageTests');
      
      this.logger.log(`💾 Saved CEFR test result: ${finalLevel} for ${dto.language}`);
    }

    user.practiceSessions.push(session);
    
    this.upsertCurrentLevel(
      user,
      dto.language,
      finalLevel,
      isCefrTest ? 'test' : 'practice',
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

    // Clean up Redis session
    try {
      await this.redisStorage.deleteSession(sessionId);
      this.logger.log(`Redis cleanup completed for ${isCefrTest ? 'CEFR test' : 'practice session'} ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to clean up Redis session ${sessionId}:`, error);
    }

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
      session.conversationLog ??= { title: '', transcript: [], audioUrls: [] };
      session.conversationLog.title = dto.conversationLog.title || session.conversationLog.title || 'Practice Session';
      session.conversationLog.transcript = dto.conversationLog.transcript.map(
        (item) => ({
          ...item,
        }),
      );
    }

    if (dto.conversationLog?.audioUrls?.length) {
      session.conversationLog ??= { title: '', transcript: [], audioUrls: [] };
      session.conversationLog.title = session.conversationLog.title || 'Practice Session';
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

  /**
   * Initialize Redis session for conversation storage
   */
  async initializeRedisSession(sessionId: string): Promise<void> {
    await this.redisStorage.initializeSession(sessionId);
  }

  /**
   * Store user transcription in Redis
   */
  async storeUserTranscription(
    sessionId: string,
    text: string,
    audioBase64: string,
    timestamp: number,
  ): Promise<void> {
    await this.redisStorage.storeUserTranscription(sessionId, text, audioBase64, timestamp);
  }

  /**
   * Store assistant response in Redis
   */
  async storeAssistantResponse(
    sessionId: string,
    text: string,
    audioBase64: string,
    timestamp: number,
  ): Promise<void> {
    await this.redisStorage.storeAssistantResponse(sessionId, text, audioBase64, timestamp);
  }

  /**
   * Generate conversation title based on language and mode
   */
  private async generateConversationTitle(
    language: Language, 
    isCefrTest: boolean, 
    messages?: any[], 
    userId?: string
  ): Promise<string> {
    if (isCefrTest) {
      return language === 'english' ? 'Placement Test' : 'Examen de Nivelación';
    }
    
    // For practice sessions, try to generate AI title first
    if (messages && messages.length > 2) {
      try {
        const aiTitle = await this.generateAITitle(language, messages);
        if (aiTitle && aiTitle.trim().length > 0) {
          return aiTitle;
        }
      } catch (error) {
        this.logger.warn('Failed to generate AI title, using fallback', error);
      }
    }
    
    // Fallback: Use numbered practice sessions
    if (userId) {
      const practiceNumber = await this.getNextPracticeNumber(userId, language);
      return language === 'english' 
        ? `Practice #${practiceNumber}` 
        : `Práctica #${practiceNumber}`;
    }
    
    // Final fallback
    return language === 'english' ? 'Practice Session' : 'Sesión de Práctica';
  }

  /**
   * Generate AI-based title from conversation content
   */
  private async generateAITitle(language: Language, messages: any[]): Promise<string | null> {
    try {
      // Get user messages to understand conversation topics
      const userMessages = messages
        .filter(msg => msg.role === 'user' && msg.text && msg.text.trim().length > 0)
        .slice(0, 5) // Use first 5 user messages
        .map(msg => msg.text)
        .join(' ');

      if (userMessages.length < 10) {
        return null; // Not enough content for meaningful title
      }

      const prompt = language === 'english' 
        ? `Based on this conversation excerpt, create a short, descriptive title (max 4 words) that captures the main topic discussed: "${userMessages}". Respond with just the title, no quotes or extra text.`
        : `Basándote en este fragmento de conversación, crea un título corto y descriptivo (máximo 4 palabras) que capture el tema principal discutido: "${userMessages}". Responde solo con el título, sin comillas ni texto extra.`;

      const response = await this.realtimeService['openai'].chat.completions.create({
        model: 'gpt-4o-mini', // Use faster model for title generation
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 20,
      });

      const title = response.choices[0]?.message?.content?.trim();
      
      // Validate title (reasonable length, no weird characters)
      if (title && title.length <= 50 && title.length >= 3 && !/[<>{}[\]]/g.test(title)) {
        return title;
      }
      
      return null;
    } catch (error) {
      this.logger.warn('Error generating AI title:', error);
      return null;
    }
  }

  /**
   * Get next practice session number for user
   */
  private async getNextPracticeNumber(userId: string, language: Language): Promise<number> {
    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user || !user.practiceSessions) {
        return 1;
      }

      // Count existing practice sessions for this language (excluding tests)
      const practiceCount = user.practiceSessions.filter(session => 
        session.language === language && 
        session.conversationLog?.title && 
        !session.conversationLog.title.toLowerCase().includes('test') &&
        !session.conversationLog.title.toLowerCase().includes('examen')
      ).length;

      return practiceCount + 1;
    } catch (error) {
      this.logger.warn('Error getting practice number:', error);
      return 1;
    }
  }
}

