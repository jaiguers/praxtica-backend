"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LanguageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const rxjs_1 = require("rxjs");
const user_schema_1 = require("../schemas/user.schema");
const language_analytics_service_1 = require("./language-analytics.service");
const openai_realtime_service_1 = require("../openai/openai-realtime.service");
const livekit_agent_service_1 = require("../livekit/livekit-agent.service");
const redis_storage_service_1 = require("./redis-storage.service");
const cefr_analysis_service_1 = require("./cefr-analysis.service");
const openai_service_1 = require("../openai/openai.service");
let LanguageService = LanguageService_1 = class LanguageService {
    constructor(userModel, analyticsService, redisStorage, cefrAnalysis, openAIService, realtimeService, livekitAgentService) {
        this.userModel = userModel;
        this.analyticsService = analyticsService;
        this.redisStorage = redisStorage;
        this.cefrAnalysis = cefrAnalysis;
        this.openAIService = openAIService;
        this.realtimeService = realtimeService;
        this.livekitAgentService = livekitAgentService;
        this.logger = new common_1.Logger(LanguageService_1.name);
        this.sessionStreams = new Map();
    }
    async createLanguageTest(userId, dto) {
        const user = await this.ensureUser(userId);
        const allowRetake = dto.allowRetake ?? false;
        const existingTest = user.languageTests?.get(dto.language);
        if (existingTest && !allowRetake) {
            throw new common_1.ConflictException(`Ya existe un test para el idioma ${dto.language}. Usa allowRetake para reemplazarlo.`);
        }
        const breakdown = {
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
        const languageTest = {
            language: dto.language,
            date: new Date(dto.date),
            level: dto.level,
            score: dto.score,
            breakdown,
            metadata,
        };
        if (!user.languageTests) {
            user.languageTests = new Map();
        }
        user.languageTests.set(dto.language, languageTest);
        user.markModified('languageTests');
        this.upsertCurrentLevel(user, dto.language, dto.level, 'test');
        await user.save();
        return languageTest;
    }
    async startPracticeSession(userId, dto) {
        const user = await this.ensureUser(userId);
        const sessionId = new mongoose_2.Types.ObjectId();
        const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();
        const feedback = this.analyticsService.createInitialFeedback(dto.language, dto.level);
        const session = {
            _id: sessionId,
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
        user.practiceSessions.push(session);
        user.markModified('practiceSessions');
        await user.save();
        const sessionKey = sessionId.toString();
        await this.redisStorage.initializeSession(sessionKey);
        const payload = {
            type: 'session.started',
            payload: {
                sessionId: sessionKey,
                userId,
                language: dto.language,
            },
            timestamp: Date.now(),
        };
        try {
            await this.realtimeService.createSession({
                sessionId: sessionKey,
                userId,
                language: dto.language,
                level: dto.level,
                mode: dto.isTest ? 'test' : 'practice',
            });
            const eventEmitter = this.realtimeService.getEventEmitter(sessionKey);
            if (eventEmitter) {
                eventEmitter.on('assistant.response.created', () => {
                    this.logger.log(`📢 Maria [${sessionKey}] is starting to respond...`);
                });
                eventEmitter.on('assistant.transcript.delta', (event) => {
                    this.emitRealtimeEvent(sessionKey, {
                        type: 'assistant.message',
                        payload: {
                            sessionId: sessionKey,
                            text: event.delta,
                            delta: event.delta,
                            isFinal: false,
                        },
                        timestamp: Date.now(),
                    });
                });
                eventEmitter.on('assistant.transcript.done', (event) => {
                    this.logger.log(`✅ Maria [${sessionKey}]: ${event.transcript}`);
                    this.emitRealtimeEvent(sessionKey, {
                        type: 'assistant.message',
                        payload: {
                            sessionId: sessionKey,
                            text: event.transcript,
                            isFinal: true,
                        },
                        timestamp: Date.now(),
                    });
                    this.storeAssistantResponse(sessionKey, event.transcript, '', Date.now());
                });
                eventEmitter.on('assistant.audio.delta', (event) => {
                    this.emitRealtimeEvent(sessionKey, {
                        type: 'assistant.message',
                        payload: {
                            sessionId: sessionKey,
                            text: '',
                            audioUrl: `data:audio/pcm;base64,${event.delta}`,
                        },
                        timestamp: Date.now(),
                    });
                });
                eventEmitter.on('error', (error) => {
                    this.logger.error(`❌ OpenAI Realtime Error [${sessionKey}]:`, error);
                });
            }
            this.logger.log(`🤖 OpenAI Realtime session created for ${sessionKey}`);
            try {
                await this.livekitAgentService.joinRoomAsAgent(sessionKey, userId);
            }
            catch (agentError) {
                this.logger.error(`Error joining LiveKit room as agent: ${agentError.message}`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to create OpenAI Realtime session: ${error.message}`);
        }
        this.emitRealtimeEvent(sessionKey, payload);
        return session;
    }
    async completePracticeSession(userId, sessionId, dto) {
        const user = await this.ensureUser(userId);
        user.practiceSessions ??= [];
        let session = (user.practiceSessions ?? []).find((item) => this.isSameObjectId(item._id, sessionId));
        if (!session) {
            this.logger.log(`Session ${sessionId} not found, creating new session for completion`);
            const feedback = this.analyticsService.createInitialFeedback(dto.language, dto.level || 'A1');
            const endTime = new Date(dto.endedAt);
            const durationMs = (dto.durationSeconds || 0) * 1000;
            const startTime = new Date(endTime.getTime() - durationMs);
            const validStartTime = isNaN(startTime.getTime()) || startTime.getTime() < 0
                ? new Date(endTime.getTime() - 300000)
                : startTime;
            this.logger.log(`Creating session with startedAt: ${validStartTime.toISOString()}, endedAt: ${endTime.toISOString()}, duration: ${dto.durationSeconds}s`);
            session = {
                _id: sessionId,
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
            };
            user.practiceSessions.push(session);
            user.markModified('practiceSessions');
        }
        const messages = await this.redisStorage.getSessionMessages(sessionId);
        messages.slice(0, 3).forEach((msg, index) => {
            this.logger.log(`📝 Message ${index + 1}: [${msg.role}] "${msg.text.substring(0, 50)}..." (length: ${msg.text.length})`);
        });
        const isCefrTest = sessionId.includes('cefr-test') || sessionId.includes('test');
        let conversationTitle = '';
        const originalLevel = dto.level || session.level;
        this.logger.log(`🎯 Original level from DTO: ${dto.level}, Session level: ${session.level}, Using: ${originalLevel}`);
        session.endedAt = new Date(dto.endedAt);
        session.durationSeconds =
            dto.durationSeconds ??
                Math.max(0, Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 1000));
        let cefrAnalysisResult;
        let analytics;
        let extractedLevel = null;
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
            const userAudioChunks = messages
                .filter(msg => msg.role === 'user' && msg.audioBase64)
                .map(msg => msg.audioBase64)
                .filter(audio => audio && audio.length > 0);
            this.logger.log(`📊 Extracted ${userAudioChunks.length} user audio chunks for analysis (total size: ${userAudioChunks.join('').length} base64 chars)`);
            try {
                cefrAnalysisResult = await this.cefrAnalysis.analyzeCefrLevel(dto.language, messages, session.durationSeconds);
                const finalLevel = extractedLevel || cefrAnalysisResult.level || originalLevel;
                cefrAnalysisResult.extractedLevel = extractedLevel;
                cefrAnalysisResult.audioSuppressed = !!extractedLevel;
                session.level = finalLevel;
                session.pronunciation = cefrAnalysisResult.feedback.pronunciation;
                session.grammar = cefrAnalysisResult.feedback.grammar;
                session.vocabulary = cefrAnalysisResult.feedback.vocabulary;
                session.fluency = cefrAnalysisResult.feedback.fluency;
                this.logger.log(`CEFR analysis completed. Final level: ${finalLevel} (extracted: ${extractedLevel}, analyzed: ${cefrAnalysisResult.level}, original: ${originalLevel})`);
            }
            catch (error) {
                this.logger.error('Error during CEFR analysis:', error);
                if (extractedLevel) {
                    session.level = extractedLevel;
                    this.logger.log(`Using extracted level ${extractedLevel} despite analysis failure`);
                }
                else {
                    session.level = originalLevel;
                    this.logger.log(`Preserving original level ${originalLevel} due to analysis failure`);
                }
            }
        }
        else if (messages.length > 0) {
            try {
                cefrAnalysisResult = await this.cefrAnalysis.analyzeCefrLevel(dto.language, messages, session.durationSeconds);
                session.pronunciation = cefrAnalysisResult.feedback.pronunciation;
                session.grammar = cefrAnalysisResult.feedback.grammar;
                session.vocabulary = cefrAnalysisResult.feedback.vocabulary;
                session.fluency = cefrAnalysisResult.feedback.fluency;
                this.logger.log(`Practice session analysis completed. Feedback updated.`);
            }
            catch (error) {
                this.logger.error('Error during practice session analysis:', error);
                if (dto.feedback) {
                    analytics = this.analyticsService.analyzeCompletion(dto, extractedLevel);
                    this.applyPracticeFeedback(session, dto, analytics.feedback);
                }
                session.level = originalLevel;
            }
        }
        else {
            if (dto.feedback) {
                analytics = this.analyticsService.analyzeCompletion(dto, extractedLevel);
                this.applyPracticeFeedback(session, dto, analytics.feedback);
            }
            session.level = extractedLevel || originalLevel;
        }
        if (!analytics) {
            if (cefrAnalysisResult) {
                analytics = {
                    feedback: cefrAnalysisResult.feedback,
                    metrics: {
                        averageScore: (cefrAnalysisResult.feedback.pronunciation.score +
                            cefrAnalysisResult.feedback.grammar.score +
                            cefrAnalysisResult.feedback.vocabulary.score +
                            cefrAnalysisResult.feedback.fluency.score) / 4,
                        recommendedLevel: cefrAnalysisResult.level,
                        fluencyRatio: cefrAnalysisResult.feedback.fluency.wordsPerMinute / 150,
                    },
                };
            }
            else {
                const dtoWithLevel = {
                    ...dto,
                    level: session.level || 'A1',
                };
                analytics = this.analyticsService.analyzeCompletion(dtoWithLevel);
            }
        }
        session.language = dto.language;
        session.completed = true;
        this.logger.log(`💾 Saving conversation history with ${messages.length} messages`);
        const validMessages = messages.filter(msg => msg.text && msg.text.trim().length > 0);
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
                audioUrls: [],
            };
        }
        else {
            session.conversationLog = {
                title: conversationTitle || (isCefrTest
                    ? (dto.language === 'english' ? 'Placement Test' : 'Examen de Nivelación')
                    : (dto.language === 'english' ? 'Practice Session' : 'Sesión de Práctica')),
                transcript: [],
                audioUrls: [],
            };
        }
        const finalLevel = extractedLevel || cefrAnalysisResult?.level || originalLevel;
        if (isCefrTest && cefrAnalysisResult) {
            if (!user.languageTests) {
                user.languageTests = new Map();
            }
            const languageTest = {
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
                    attachments: [],
                },
            };
            user.languageTests.set(dto.language, languageTest);
            user.markModified('languageTests');
            this.logger.log(`💾 Saved CEFR test result: ${finalLevel} for ${dto.language}`);
        }
        this.upsertCurrentLevel(user, dto.language, finalLevel, isCefrTest ? 'test' : 'practice');
        user.markModified('practiceSessions');
        user.markModified('currentLevels');
        await user.save();
        const completionEvent = {
            type: 'session.completed',
            payload: analytics.metrics,
            timestamp: Date.now(),
        };
        this.emitRealtimeEvent(sessionId, completionEvent);
        this.completeRealtimeStream(sessionId);
        try {
            await this.redisStorage.deleteSession(sessionId);
            this.logger.log(`Redis cleanup completed for ${isCefrTest ? 'CEFR test' : 'practice session'} ${sessionId}`);
        }
        catch (error) {
            this.logger.error(`Failed to clean up Redis session ${sessionId}:`, error);
        }
        return session;
    }
    getSessionStream(sessionId) {
        const stream = this.ensureStream(sessionId);
        return stream.asObservable();
    }
    emitRealtimeEvent(sessionId, event) {
        const stream = this.ensureStream(sessionId);
        const messageEvent = {
            data: event,
        };
        stream.next(messageEvent);
    }
    completeRealtimeStream(sessionId) {
        const stream = this.sessionStreams.get(sessionId);
        if (stream) {
            stream.complete();
            this.sessionStreams.delete(sessionId);
        }
    }
    ensureStream(sessionId) {
        if (!this.sessionStreams.has(sessionId)) {
            this.sessionStreams.set(sessionId, new rxjs_1.Subject());
        }
        return this.sessionStreams.get(sessionId);
    }
    applyPracticeFeedback(session, dto, feedback) {
        session.pronunciation = feedback.pronunciation;
        session.grammar = feedback.grammar;
        session.vocabulary = feedback.vocabulary;
        session.fluency = feedback.fluency;
        if (dto.conversationLog?.transcript?.length) {
            session.conversationLog ??= { title: '', transcript: [], audioUrls: [] };
            session.conversationLog.title = dto.conversationLog.title || session.conversationLog.title || 'Practice Session';
            session.conversationLog.transcript = dto.conversationLog.transcript.map((item) => ({
                ...item,
            }));
        }
        if (dto.conversationLog?.audioUrls?.length) {
            session.conversationLog ??= { title: '', transcript: [], audioUrls: [] };
            session.conversationLog.title = session.conversationLog.title || 'Practice Session';
            session.conversationLog.audioUrls = dto.conversationLog.audioUrls.map((item) => ({ ...item }));
        }
    }
    upsertCurrentLevel(user, language, level, source) {
        if (!user.currentLevels) {
            user.currentLevels = new Map();
        }
        user.currentLevels.set(language, {
            level,
            lastUpdated: new Date(),
            source,
        });
    }
    buildSystemPrompt(language, level, dto) {
        const topics = dto.topics && dto.topics.length > 0
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
    async ensureUser(userId) {
        const user = await this.userModel.findById(userId).exec();
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        return user;
    }
    isSameObjectId(value, comparison) {
        if (!value)
            return false;
        const current = value instanceof mongoose_2.Types.ObjectId ? value.toHexString() : String(value);
        return current === comparison;
    }
    async initializeRedisSession(sessionId) {
        await this.redisStorage.initializeSession(sessionId);
    }
    async storeUserTranscription(sessionId, text, audioBase64, timestamp) {
        await this.redisStorage.storeUserTranscription(sessionId, text, audioBase64, timestamp);
    }
    async storeAssistantResponse(sessionId, text, audioBase64, timestamp) {
        await this.redisStorage.storeAssistantResponse(sessionId, text, audioBase64, timestamp);
    }
    async generateConversationTitle(language, isCefrTest, messages, userId) {
        if (isCefrTest) {
            return language === 'english' ? 'Placement Test' : 'Examen de Nivelación';
        }
        if (messages && messages.length > 2) {
            try {
                const aiTitle = await this.generateAITitle(language, messages);
                if (aiTitle && aiTitle.trim().length > 0) {
                    return aiTitle;
                }
            }
            catch (error) {
                this.logger.warn('Failed to generate AI title, using fallback', error);
            }
        }
        if (userId) {
            const practiceNumber = await this.getNextPracticeNumber(userId, language);
            return language === 'english'
                ? `Practice #${practiceNumber}`
                : `Práctica #${practiceNumber}`;
        }
        return language === 'english' ? 'Practice Session' : 'Sesión de Práctica';
    }
    async generateAITitle(language, messages) {
        try {
            const userMessages = messages
                .filter(msg => msg.role === 'user' && msg.text && msg.text.trim().length > 0)
                .slice(0, 5)
                .map(msg => msg.text)
                .join(' ');
            if (userMessages.length < 10) {
                return null;
            }
            const prompt = language === 'english'
                ? `Based on this conversation excerpt, create a short, descriptive title (max 4 words) that captures the main topic discussed: "${userMessages}". Respond with just the title, no quotes or extra text.`
                : `Basándote en este fragmento de conversación, crea un título corto y descriptivo (máximo 4 palabras) que capture el tema principal discutido: "${userMessages}". Responde solo con el título, sin comillas ni texto extra.`;
            const response = await this.openAIService.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 20,
            });
            const title = response.choices[0]?.message?.content?.trim();
            if (title && title.length <= 50 && title.length >= 3 && !/[<>{}[\]]/g.test(title)) {
                return title;
            }
            return null;
        }
        catch (error) {
            this.logger.warn('Error generating AI title:', error);
            return null;
        }
    }
    async getNextPracticeNumber(userId, language) {
        try {
            const user = await this.userModel.findById(userId).exec();
            if (!user || !user.practiceSessions) {
                return 1;
            }
            const practiceCount = user.practiceSessions.filter(session => session.language === language &&
                session.conversationLog?.title &&
                !session.conversationLog.title.toLowerCase().includes('test') &&
                !session.conversationLog.title.toLowerCase().includes('examen')).length;
            return practiceCount + 1;
        }
        catch (error) {
            this.logger.warn('Error getting practice number:', error);
            return 1;
        }
    }
};
exports.LanguageService = LanguageService;
exports.LanguageService = LanguageService = LanguageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        language_analytics_service_1.LanguageAnalyticsService,
        redis_storage_service_1.RedisStorageService,
        cefr_analysis_service_1.CefrAnalysisService,
        openai_service_1.OpenAIService,
        openai_realtime_service_1.OpenAIRealtimeService,
        livekit_agent_service_1.LiveKitAgentService])
], LanguageService);
//# sourceMappingURL=language.service.js.map