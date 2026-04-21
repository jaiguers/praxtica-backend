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
var LiveKitAgentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveKitAgentService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const rtc_node_1 = require("@livekit/rtc-node");
const openai_realtime_service_1 = require("../openai/openai-realtime.service");
const livekit_service_1 = require("./livekit.service");
let LiveKitAgentService = LiveKitAgentService_1 = class LiveKitAgentService {
    constructor(configService, livekitService, openaiRealtimeService) {
        this.configService = configService;
        this.livekitService = livekitService;
        this.openaiRealtimeService = openaiRealtimeService;
        this.logger = new common_1.Logger(LiveKitAgentService_1.name);
        this.activeRooms = new Map();
        this.audioSources = new Map();
        this.publishedTrackSids = new Map();
        this.assistantTranscriptState = new Map();
    }
    async joinRoomAsAgent(sessionId, userId) {
        if (this.activeRooms.has(sessionId)) {
            this.logger.warn(`Agent already in room for session ${sessionId}`);
            return;
        }
        const url = this.configService.get('LIVEKIT_URL');
        const token = await this.livekitService.generateToken('maria-agent', sessionId, 'Maria (AI)');
        const room = new rtc_node_1.Room();
        this.activeRooms.set(sessionId, room);
        room
            .on(rtc_node_1.RoomEvent.TrackSubscribed, (track, publication, participant) => {
            if (track.kind === rtc_node_1.TrackKind.KIND_AUDIO) {
                this.logger.log(`Subscribed to audio track from ${participant.identity}`);
                this.handleIncomingAudio(sessionId, track);
            }
        })
            .on(rtc_node_1.RoomEvent.Disconnected, () => {
            this.logger.log(`Agent disconnected from room ${sessionId}`);
            this.cleanup(sessionId);
        });
        try {
            await room.connect(url, token);
            this.logger.log(`🤖 Maria Agent connected to room: ${sessionId}`);
            const audioSource = new rtc_node_1.AudioSource(24000, 1);
            this.audioSources.set(sessionId, audioSource);
            const track = rtc_node_1.LocalAudioTrack.createAudioTrack('maria-voice', audioSource);
            const publishOptions = new rtc_node_1.TrackPublishOptions({
                source: rtc_node_1.TrackSource.SOURCE_MICROPHONE,
            });
            const publication = await room.localParticipant.publishTrack(track, publishOptions);
            this.publishedTrackSids.set(sessionId, publication.sid);
            this.bridgeOpenAIToLiveKit(sessionId, audioSource);
            this.bridgeOpenAITranscriptToLiveKit(sessionId, room);
        }
        catch (error) {
            this.logger.error(`Failed to connect Maria Agent to room ${sessionId}:`, error);
            this.cleanup(sessionId);
            throw error;
        }
    }
    async handleIncomingAudio(sessionId, track) {
        this.logger.log(`🎤 Capturando audio de LiveKit para enviar a OpenAI (Sesión: ${sessionId})`);
        try {
            const audioStream = new rtc_node_1.AudioStream(track);
            for await (const frame of audioStream) {
                this.openaiRealtimeService.sendAudio(sessionId, frame.data);
            }
        }
        catch (error) {
            this.logger.error(`AudioStream error in session ${sessionId}: ${error.message}`);
        }
    }
    bridgeOpenAIToLiveKit(sessionId, audioSource) {
        const eventEmitter = this.openaiRealtimeService.getEventEmitter(sessionId);
        if (!eventEmitter)
            return;
        const SAMPLE_RATE = 24000;
        const CHANNELS = 1;
        const SAMPLES_PER_FRAME = 240;
        let audioBuffer = new Int16Array(0);
        let isProcessing = false;
        const processQueue = async () => {
            if (isProcessing)
                return;
            isProcessing = true;
            try {
                while (audioBuffer.length >= SAMPLES_PER_FRAME) {
                    const frameData = audioBuffer.slice(0, SAMPLES_PER_FRAME);
                    const nextBuffer = new Int16Array(audioBuffer.length - SAMPLES_PER_FRAME);
                    nextBuffer.set(audioBuffer.subarray(SAMPLES_PER_FRAME));
                    audioBuffer = nextBuffer;
                    const frame = new rtc_node_1.AudioFrame(frameData, SAMPLE_RATE, CHANNELS, SAMPLES_PER_FRAME);
                    await audioSource.captureFrame(frame);
                }
            }
            catch (error) {
                this.logger.error(`Error sending frame to LiveKit: ${error.message}`);
            }
            finally {
                isProcessing = false;
            }
        };
        eventEmitter.on('assistant.audio.delta', (event) => {
            try {
                const buffer = Buffer.from(event.delta, 'base64');
                const newData = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
                const combinedBuffer = new Int16Array(audioBuffer.length + newData.length);
                combinedBuffer.set(audioBuffer);
                combinedBuffer.set(newData, audioBuffer.length);
                audioBuffer = combinedBuffer;
                processQueue().catch(e => {
                    this.logger.error(`Error in queue processing: ${e.message}`);
                });
            }
            catch (error) {
                this.logger.error(`Error bridging audio from OpenAI to LiveKit: ${error.message}`);
            }
        });
    }
    bridgeOpenAITranscriptToLiveKit(sessionId, room) {
        const eventEmitter = this.openaiRealtimeService.getEventEmitter(sessionId);
        const trackSid = this.publishedTrackSids.get(sessionId);
        if (!eventEmitter || !trackSid || !room.localParticipant) {
            this.logger.warn(`Unable to bridge Maria transcription for session ${sessionId}`);
            return;
        }
        eventEmitter.on('assistant.transcript.delta', async (event) => {
            if (!event.delta?.trim()) {
                return;
            }
            const state = this.getOrCreateAssistantTranscriptState(sessionId);
            state.text += event.delta;
            await this.publishTranscriptionSegment(room, trackSid, state.segmentId, state.text, state.startedAtMs, Date.now(), false);
        });
        eventEmitter.on('assistant.transcript.done', async (event) => {
            const finalText = event.transcript?.trim();
            if (!finalText) {
                return;
            }
            const state = this.getOrCreateAssistantTranscriptState(sessionId);
            state.text = finalText;
            await this.publishTranscriptionSegment(room, trackSid, state.segmentId, finalText, state.startedAtMs, Date.now(), true);
            this.assistantTranscriptState.delete(sessionId);
        });
    }
    getOrCreateAssistantTranscriptState(sessionId) {
        const existing = this.assistantTranscriptState.get(sessionId);
        if (existing) {
            return existing;
        }
        const created = {
            segmentId: (0, crypto_1.randomUUID)(),
            text: '',
            startedAtMs: Date.now(),
        };
        this.assistantTranscriptState.set(sessionId, created);
        return created;
    }
    async publishTranscriptionSegment(room, trackSid, segmentId, text, startTimeMs, endTimeMs, final) {
        try {
            await room.localParticipant.publishTranscription({
                participantIdentity: room.localParticipant.identity,
                trackSid,
                segments: [
                    {
                        id: segmentId,
                        text,
                        startTime: BigInt(startTimeMs),
                        endTime: BigInt(endTimeMs),
                        final,
                        language: 'es',
                    },
                ],
            });
        }
        catch (error) {
            this.logger.error(`Error publishing transcription to LiveKit: ${error.message}`);
        }
    }
    cleanup(sessionId) {
        this.activeRooms.delete(sessionId);
        this.audioSources.delete(sessionId);
        this.publishedTrackSids.delete(sessionId);
        this.assistantTranscriptState.delete(sessionId);
    }
    async onModuleDestroy() {
        for (const room of this.activeRooms.values()) {
            await room.disconnect();
        }
    }
};
exports.LiveKitAgentService = LiveKitAgentService;
exports.LiveKitAgentService = LiveKitAgentService = LiveKitAgentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        livekit_service_1.LiveKitService,
        openai_realtime_service_1.OpenAIRealtimeService])
], LiveKitAgentService);
//# sourceMappingURL=livekit-agent.service.js.map