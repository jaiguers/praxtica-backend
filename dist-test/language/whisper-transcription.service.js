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
var WhisperTranscriptionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhisperTranscriptionService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = require("openai");
let WhisperTranscriptionService = WhisperTranscriptionService_1 = class WhisperTranscriptionService {
    constructor() {
        this.logger = new common_1.Logger(WhisperTranscriptionService_1.name);
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    async transcribeAudio(audioBase64, language, sessionId) {
        try {
            this.logger.log(`🎤 Transcribing audio for session ${sessionId}, size: ${audioBase64.length} chars`);
            if (!audioBase64 || audioBase64.length === 0) {
                throw new Error('Empty audio data provided');
            }
            const pcmBuffer = Buffer.from(audioBase64, 'base64');
            if (pcmBuffer.length < 1000) {
                this.logger.warn(`⚠️ PCM buffer very small: ${pcmBuffer.length} bytes, may not contain valid audio`);
            }
            const wavBuffer = this.convertPCM16ToWAV(pcmBuffer);
            const audioFile = new File([new Uint8Array(wavBuffer)], 'audio.wav', {
                type: 'audio/wav',
            });
            const response = await this.openai.audio.transcriptions.create({
                file: audioFile,
                model: 'whisper-1',
                language: language === 'english' ? 'en' : 'es',
                response_format: 'text',
            });
            const transcript = response.trim();
            this.logger.log(`✅ Transcription completed for session ${sessionId}: "${transcript}"`);
            return transcript;
        }
        catch (error) {
            this.logger.error(`❌ Error transcribing audio for session ${sessionId}:`, error);
            if (error instanceof Error) {
                this.logger.error(`❌ Error details: ${error.message}`);
                if (error.message.includes('could not be decoded')) {
                    this.logger.error(`❌ Audio format issue - PCM16 to WAV conversion may be incorrect`);
                }
            }
            return '';
        }
    }
    convertPCM16ToWAV(pcmBuffer) {
        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * bitsPerSample / 8;
        const blockAlign = numChannels * bitsPerSample / 8;
        const dataSize = pcmBuffer.length;
        const fileSize = 36 + dataSize;
        const header = Buffer.alloc(44);
        let offset = 0;
        header.write('RIFF', offset);
        offset += 4;
        header.writeUInt32LE(fileSize, offset);
        offset += 4;
        header.write('WAVE', offset);
        offset += 4;
        header.write('fmt ', offset);
        offset += 4;
        header.writeUInt32LE(16, offset);
        offset += 4;
        header.writeUInt16LE(1, offset);
        offset += 2;
        header.writeUInt16LE(numChannels, offset);
        offset += 2;
        header.writeUInt32LE(sampleRate, offset);
        offset += 4;
        header.writeUInt32LE(byteRate, offset);
        offset += 4;
        header.writeUInt16LE(blockAlign, offset);
        offset += 2;
        header.writeUInt16LE(bitsPerSample, offset);
        offset += 2;
        header.write('data', offset);
        offset += 4;
        header.writeUInt32LE(dataSize, offset);
        return Buffer.concat([header, pcmBuffer]);
    }
};
exports.WhisperTranscriptionService = WhisperTranscriptionService;
exports.WhisperTranscriptionService = WhisperTranscriptionService = WhisperTranscriptionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], WhisperTranscriptionService);
//# sourceMappingURL=whisper-transcription.service.js.map