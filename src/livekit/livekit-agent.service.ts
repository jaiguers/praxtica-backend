import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Room, RoomEvent, RemoteParticipant, RemoteTrackPublication, RemoteTrack, Track, AudioFrame, AudioSource, AudioStream, TrackKind, TrackSource, LocalAudioTrack, TrackPublishOptions } from '@livekit/rtc-node';
import { OpenAIRealtimeService } from '../openai/openai-realtime.service';
import { LiveKitService } from './livekit.service';

@Injectable()
export class LiveKitAgentService implements OnModuleDestroy {
    private readonly logger = new Logger(LiveKitAgentService.name);
    private readonly activeRooms = new Map<string, Room>();
    private readonly audioSources = new Map<string, AudioSource>();

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
            await room.localParticipant.publishTrack(track, publishOptions);

            // Vincular el audio que viene de OpenAI hacia LiveKit
            this.bridgeOpenAIToLiveKit(sessionId, audioSource);

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
                // OpenAI espera PCM16 Mono 24kHz.
                // Accedemos a los datos mediante frame.data (Int16Array)
                this.openaiRealtimeService.sendAudio(sessionId, frame.data);
            }
        } catch (error) {
            this.logger.error(`AudioStream error in session ${sessionId}: ${error.message}`);
        }
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

    private cleanup(sessionId: string) {
        this.activeRooms.delete(sessionId);
        this.audioSources.delete(sessionId);
    }

    async onModuleDestroy() {
        for (const room of this.activeRooms.values()) {
            await room.disconnect();
        }
    }
}
