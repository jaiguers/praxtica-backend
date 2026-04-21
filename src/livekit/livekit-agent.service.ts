import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Room, RoomEvent, RemoteParticipant, RemoteTrackPublication, RemoteTrack, AudioFrame, AudioSource, AudioStream, TrackKind, TrackSource, LocalAudioTrack, TrackPublishOptions } from '@livekit/rtc-node';
import { OpenAIRealtimeService } from '../openai/openai-realtime.service';
import { LiveKitService } from './livekit.service';

interface AssistantTranscriptState {
    segmentId: string;
    text: string;
    startedAtMs: number;
}

interface MariaSubtitleDataMessage {
    type: 'maria_subtitle';
    participantIdentity: string;
    trackSid: string;
    segmentId: string;
    text: string;
    final: boolean;
    startTimeMs: number;
    endTimeMs: number;
    language: string;
}

@Injectable()
export class LiveKitAgentService implements OnModuleDestroy {
    private readonly logger = new Logger(LiveKitAgentService.name);
    private readonly activeRooms = new Map<string, Room>();
    private readonly audioSources = new Map<string, AudioSource>();
    private readonly publishedTrackSids = new Map<string, string>();
    private readonly assistantTranscriptState = new Map<string, AssistantTranscriptState>();

    constructor(
        private readonly configService: ConfigService,
        private readonly livekitService: LiveKitService,
        private readonly openaiRealtimeService: OpenAIRealtimeService,
    ) { }

    /**
     * Une a María (la IA) al cuarto de LiveKit para que el audio fluya bidireccionalmente
     */
    async joinRoomAsAgent(sessionId: string, userId: string) {
        if (this.activeRooms.has(sessionId)) {
            this.logger.warn(`Agent already in room for session ${sessionId}`);
            return;
        }

        const url = this.configService.get<string>('LIVEKIT_URL');
        // Generamos un token especial para el Agente (María)
        const token = await this.livekitService.generateToken('maria-agent', sessionId, 'Maria (AI)');

        const room = new Room();
        this.activeRooms.set(sessionId, room);

        // Configurar handlers de eventos de LiveKit
        room
            .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
                if (track.kind === TrackKind.KIND_AUDIO) {
                    this.logger.log(`Subscribed to audio track from ${participant.identity}`);
                    this.handleIncomingAudio(sessionId, track);
                }
            })
            .on(RoomEvent.Disconnected, () => {
                this.logger.log(`Agent disconnected from room ${sessionId}`);
                this.cleanup(sessionId);
            });

        try {
            await room.connect(url, token);
            this.logger.log(`🤖 Maria Agent connected to room: ${sessionId}`);
            this.logger.log(
                `[LiveKit][Agent] Connected details session=${sessionId} localParticipant=${room.localParticipant?.identity} roomName=${room.name ?? sessionId}`,
            );

            // Crear una fuente de audio para que María pueda hablar
            // OpenAI Realtime entrega PCM 16-bit, 24kHz, Mono
            const audioSource = new AudioSource(24000, 1);
            this.audioSources.set(sessionId, audioSource);

            // Crear el track de audio desde la fuente
            const track = LocalAudioTrack.createAudioTrack('maria-voice', audioSource);

            // Publicar el track de audio de María
            const publishOptions = new TrackPublishOptions({
                source: TrackSource.SOURCE_MICROPHONE,
            });
            const publication = await room.localParticipant.publishTrack(track, publishOptions);
            this.publishedTrackSids.set(sessionId, publication.sid!);
            this.logger.log(
                `[LiveKit][Agent] Published Maria track session=${sessionId} participant=${room.localParticipant?.identity} trackName=${track.name} trackSid=${publication.sid} source=${publishOptions.source}`,
            );

            // Vincular el audio que viene de OpenAI hacia LiveKit
            this.bridgeOpenAIToLiveKit(sessionId, audioSource);
            this.bridgeOpenAITranscriptToLiveKit(sessionId, room);
            this.bridgeUserSpeechDebugEvents(sessionId);

        } catch (error) {
            this.logger.error(`Failed to connect Maria Agent to room ${sessionId}:`, error);
            this.cleanup(sessionId);
            throw error;
        }
    }

    /**
     * Toma el audio del usuario en LiveKit y lo envía a OpenAI
     */
    private async handleIncomingAudio(sessionId: string, track: RemoteTrack) {
        this.logger.log(`🎤 Capturando audio de LiveKit para enviar a OpenAI (Sesión: ${sessionId})`);

        try {
            // AudioStream en @livekit/rtc-node es un AsyncIterable, no un EventEmitter
            const audioStream = new AudioStream(track);

            for await (const frame of audioStream as any) {
                const normalizedFrame = this.normalizeInputAudioFrame(frame);
                if (normalizedFrame.length === 0) {
                    continue;
                }

                this.openaiRealtimeService.sendAudio(sessionId, normalizedFrame);
            }
        } catch (error) {
            this.logger.error(`AudioStream error in session ${sessionId}: ${error.message}`);
        }
    }

    /**
     * Convierte el audio de LiveKit al formato esperado por OpenAI Realtime:
     * PCM16, mono, 24kHz.
     */
    private normalizeInputAudioFrame(frame: {
        data?: Int16Array;
        sampleRate?: number;
        channels?: number;
    }): Int16Array {
        const data = frame.data;
        if (!data || data.length === 0) {
            return new Int16Array(0);
        }

        const inputSampleRate = frame.sampleRate ?? 48000;
        const inputChannels = Math.max(1, frame.channels ?? 1);

        let monoData: Int16Array;
        if (inputChannels === 1) {
            monoData = data;
        } else {
            const monoLength = Math.floor(data.length / inputChannels);
            monoData = new Int16Array(monoLength);

            for (let i = 0; i < monoLength; i++) {
                let sum = 0;
                for (let ch = 0; ch < inputChannels; ch++) {
                    sum += data[i * inputChannels + ch];
                }
                monoData[i] = Math.round(sum / inputChannels);
            }
        }

        if (inputSampleRate === 24000) {
            return monoData;
        }

        const ratio = inputSampleRate / 24000;
        if (!Number.isFinite(ratio) || ratio <= 0) {
            this.logger.warn(
                `[LiveKit][AudioIn] Unexpected sample rate ${inputSampleRate}, forwarding mono audio without resampling`,
            );
            return monoData;
        }

        const outputLength = Math.max(1, Math.round(monoData.length / ratio));
        const resampled = new Int16Array(outputLength);

        for (let i = 0; i < outputLength; i++) {
            const start = Math.floor(i * ratio);
            const end = Math.min(monoData.length, Math.floor((i + 1) * ratio));

            if (end <= start) {
                resampled[i] = monoData[Math.min(start, monoData.length - 1)];
                continue;
            }

            let sum = 0;
            for (let j = start; j < end; j++) {
                sum += monoData[j];
            }
            resampled[i] = Math.round(sum / (end - start));
        }

        return resampled;
    }

    /**
     * Toma el audio que viene de OpenAI y lo "inyecta" como frames en LiveKit
     * Se asegura de que se envíen de manera secuencial y en ráfagas (chunks) de 10ms
     */
    private bridgeOpenAIToLiveKit(sessionId: string, audioSource: AudioSource) {
        const eventEmitter = this.openaiRealtimeService.getEventEmitter(sessionId);
        if (!eventEmitter) return;

        // Búfer para acumular muestras y enviarlas en frames de 10ms
        const SAMPLE_RATE = 24000;
        const CHANNELS = 1;
        const SAMPLES_PER_FRAME = 240; // 10ms a 24000Hz (24000 / 100)

        let audioBuffer = new Int16Array(0);
        let isProcessing = false;

        const processQueue = async () => {
            if (isProcessing) return;
            isProcessing = true;

            try {
                while (audioBuffer.length >= SAMPLES_PER_FRAME) {
                    const frameData = audioBuffer.slice(0, SAMPLES_PER_FRAME);

                    const nextBuffer = new Int16Array(audioBuffer.length - SAMPLES_PER_FRAME);
                    nextBuffer.set(audioBuffer.subarray(SAMPLES_PER_FRAME));
                    audioBuffer = nextBuffer;

                    const frame = new AudioFrame(frameData, SAMPLE_RATE, CHANNELS, SAMPLES_PER_FRAME);
                    await audioSource.captureFrame(frame);
                }
            } catch (error) {
                this.logger.error(`Error sending frame to LiveKit: ${error.message}`);
            } finally {
                isProcessing = false;
            }
        };

        eventEmitter.on('assistant.audio.delta', (event: { delta: string }) => {
            try {
                // Convertir base64 de OpenAI (PCM16) a Buffer
                const buffer = Buffer.from(event.delta, 'base64');
                const newData = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);

                // Acumular la nueva información en audioBuffer
                const combinedBuffer = new Int16Array(audioBuffer.length + newData.length);
                combinedBuffer.set(audioBuffer);
                combinedBuffer.set(newData, audioBuffer.length);
                audioBuffer = combinedBuffer;

                // Intentar procesar la cola
                processQueue().catch(e => {
                    this.logger.error(`Error in queue processing: ${e.message}`);
                });
            } catch (error) {
                this.logger.error(`Error bridging audio from OpenAI to LiveKit: ${error.message}`);
            }
        });
    }

    /**
     * Publica las transcripciones de Maria en LiveKit asociadas a su track de audio
     * para que el frontend pueda renderizar subtitulos nativos.
     */
    private bridgeOpenAITranscriptToLiveKit(sessionId: string, room: Room) {
        const eventEmitter = this.openaiRealtimeService.getEventEmitter(sessionId);
        const trackSid = this.publishedTrackSids.get(sessionId);

        if (!eventEmitter || !trackSid || !room.localParticipant) {
            this.logger.warn(`Unable to bridge Maria transcription for session ${sessionId}`);
            return;
        }

        this.logger.log(
            `[LiveKit][Transcript] Bridge ready session=${sessionId} room=${room.name ?? sessionId} participant=${room.localParticipant.identity} trackSid=${trackSid}`,
        );

        eventEmitter.on('assistant.transcript.delta', async (event: { delta?: string }) => {
            if (!event.delta?.trim()) {
                return;
            }

            const state = this.getOrCreateAssistantTranscriptState(sessionId);
            state.text += event.delta;
            this.logger.log(
                `[LiveKit][Transcript] Delta received session=${sessionId} trackSid=${trackSid} segmentId=${state.segmentId} accumulatedLength=${state.text.length} chunk="${event.delta.slice(0, 80)}"`,
            );

            await this.publishTranscriptionSegment(
                room,
                trackSid,
                state.segmentId,
                state.text,
                state.startedAtMs,
                Date.now(),
                false,
            );
            await this.publishSubtitleDataMessage(
                room,
                trackSid,
                state.segmentId,
                state.text,
                state.startedAtMs,
                Date.now(),
                false,
            );
        });

        eventEmitter.on('assistant.transcript.done', async (event: { transcript?: string }) => {
            const finalText = event.transcript?.trim();
            if (!finalText) {
                return;
            }

            const state = this.getOrCreateAssistantTranscriptState(sessionId);
            state.text = finalText;
            this.logger.log(
                `[LiveKit][Transcript] Final received session=${sessionId} trackSid=${trackSid} segmentId=${state.segmentId} textLength=${finalText.length} text="${finalText.slice(0, 160)}"`,
            );

            await this.publishTranscriptionSegment(
                room,
                trackSid,
                state.segmentId,
                finalText,
                state.startedAtMs,
                Date.now(),
                true,
            );
            await this.publishSubtitleDataMessage(
                room,
                trackSid,
                state.segmentId,
                finalText,
                state.startedAtMs,
                Date.now(),
                true,
            );

            this.assistantTranscriptState.delete(sessionId);
        });
    }

    private bridgeUserSpeechDebugEvents(sessionId: string) {
        const eventEmitter = this.openaiRealtimeService.getEventEmitter(sessionId);
        if (!eventEmitter) {
            return;
        }

        eventEmitter.on('user.speech.started', () => {
            this.logger.log(`[OpenAI][UserAudio] Speech started session=${sessionId}`);
        });

        eventEmitter.on('user.speech.stopped', () => {
            this.logger.log(`[OpenAI][UserAudio] Speech stopped session=${sessionId}`);
        });

        eventEmitter.on('user.audio.committed', () => {
            this.logger.log(`[OpenAI][UserAudio] Audio committed session=${sessionId}`);
        });

        eventEmitter.on('user.transcription.completed', (event: { transcript?: string }) => {
            this.logger.log(
                `[OpenAI][UserAudio] Transcription completed session=${sessionId} text="${event.transcript?.slice(0, 160) ?? ''}"`,
            );
        });
    }

    private getOrCreateAssistantTranscriptState(sessionId: string): AssistantTranscriptState {
        const existing = this.assistantTranscriptState.get(sessionId);
        if (existing) {
            return existing;
        }

        const created: AssistantTranscriptState = {
            segmentId: randomUUID(),
            text: '',
            startedAtMs: Date.now(),
        };
        this.assistantTranscriptState.set(sessionId, created);
        return created;
    }

    private async publishTranscriptionSegment(
        room: Room,
        trackSid: string,
        segmentId: string,
        text: string,
        startTimeMs: number,
        endTimeMs: number,
        final: boolean,
    ) {
        try {
            this.logger.log(
                `[LiveKit][Transcript] Publishing session=${room.name ?? 'unknown'} participant=${room.localParticipant?.identity} trackSid=${trackSid} segmentId=${segmentId} final=${final} start=${startTimeMs} end=${endTimeMs} text="${text.slice(0, 160)}"`,
            );
            await room.localParticipant!.publishTranscription({
                participantIdentity: room.localParticipant!.identity,
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
            this.logger.log(
                `[LiveKit][Transcript] Published OK session=${room.name ?? 'unknown'} trackSid=${trackSid} segmentId=${segmentId} final=${final}`,
            );
        } catch (error) {
            this.logger.error(
                `[LiveKit][Transcript] Error publishing session=${room.name ?? 'unknown'} trackSid=${trackSid} segmentId=${segmentId} final=${final}: ${error.message}`,
                error.stack,
            );
        }
    }

    private async publishSubtitleDataMessage(
        room: Room,
        trackSid: string,
        segmentId: string,
        text: string,
        startTimeMs: number,
        endTimeMs: number,
        final: boolean,
    ) {
        if (!room.localParticipant || !text.trim()) {
            return;
        }

        const payload: MariaSubtitleDataMessage = {
            type: 'maria_subtitle',
            participantIdentity: room.localParticipant.identity,
            trackSid,
            segmentId,
            text,
            final,
            startTimeMs,
            endTimeMs,
            language: 'es',
        };

        try {
            const encoded = new TextEncoder().encode(JSON.stringify(payload));
            this.logger.log(
                `[LiveKit][Data] Publishing subtitle session=${room.name ?? 'unknown'} trackSid=${trackSid} segmentId=${segmentId} final=${final} bytes=${encoded.byteLength} text="${text.slice(0, 160)}"`,
            );
            await room.localParticipant.publishData(encoded, {
                reliable: true,
                topic: 'maria_subtitles',
            });
            this.logger.log(
                `[LiveKit][Data] Published subtitle OK session=${room.name ?? 'unknown'} trackSid=${trackSid} segmentId=${segmentId} final=${final}`,
            );
        } catch (error) {
            this.logger.error(
                `[LiveKit][Data] Error publishing subtitle session=${room.name ?? 'unknown'} trackSid=${trackSid} segmentId=${segmentId} final=${final}: ${error.message}`,
                error.stack,
            );
        }
    }

    private cleanup(sessionId: string) {
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
}
