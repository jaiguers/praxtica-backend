import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { Language } from '../schemas/user.schema';

@Injectable()
export class WhisperTranscriptionService {
  private readonly logger = new Logger(WhisperTranscriptionService.name);
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Transcribe audio using OpenAI Whisper API
   */
  async transcribeAudio(
    audioBase64: string,
    language: Language,
    sessionId: string,
  ): Promise<string> {
    try {
      this.logger.log(`🎤 Transcribing audio for session ${sessionId}, size: ${audioBase64.length} chars`);

      // Validate input
      if (!audioBase64 || audioBase64.length === 0) {
        throw new Error('Empty audio data provided');
      }

      // Convert base64 to buffer (PCM16 format from OpenAI Realtime)
      const pcmBuffer = Buffer.from(audioBase64, 'base64');
      
      // Validate PCM buffer size (should be reasonable for audio)
      if (pcmBuffer.length < 1000) {
        this.logger.warn(`⚠️ PCM buffer very small: ${pcmBuffer.length} bytes, may not contain valid audio`);
      }
      
      // Convert PCM16 to WAV format for Whisper
      const wavBuffer = this.convertPCM16ToWAV(pcmBuffer);
      
      // Create a File-like object for the API
      const audioFile = new File([new Uint8Array(wavBuffer)], 'audio.wav', {
        type: 'audio/wav',
      });

      // Call Whisper API
      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: language === 'english' ? 'en' : 'es',
        response_format: 'text',
      });

      const transcript = response.trim();
      this.logger.log(`✅ Transcription completed for session ${sessionId}: "${transcript}"`);
      
      return transcript;
    } catch (error) {
      this.logger.error(`❌ Error transcribing audio for session ${sessionId}:`, error);
      
      // Log more details about the error
      if (error instanceof Error) {
        this.logger.error(`❌ Error details: ${error.message}`);
        if (error.message.includes('could not be decoded')) {
          this.logger.error(`❌ Audio format issue - PCM16 to WAV conversion may be incorrect`);
        }
      }
      
      // Don't throw the error, return empty string to prevent breaking the flow
      return '';
    }
  }

  /**
   * Convert PCM16 buffer to WAV format
   */
  private convertPCM16ToWAV(pcmBuffer: Buffer): Buffer {
    const sampleRate = 24000; // OpenAI Realtime uses 24kHz
    const numChannels = 1; // Mono
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = pcmBuffer.length;
    const fileSize = 36 + dataSize;

    // Create WAV header
    const header = Buffer.alloc(44);
    let offset = 0;

    // RIFF chunk descriptor
    header.write('RIFF', offset); offset += 4;
    header.writeUInt32LE(fileSize, offset); offset += 4;
    header.write('WAVE', offset); offset += 4;

    // fmt sub-chunk
    header.write('fmt ', offset); offset += 4;
    header.writeUInt32LE(16, offset); offset += 4; // Sub-chunk size
    header.writeUInt16LE(1, offset); offset += 2; // Audio format (PCM)
    header.writeUInt16LE(numChannels, offset); offset += 2;
    header.writeUInt32LE(sampleRate, offset); offset += 4;
    header.writeUInt32LE(byteRate, offset); offset += 4;
    header.writeUInt16LE(blockAlign, offset); offset += 2;
    header.writeUInt16LE(bitsPerSample, offset); offset += 2;

    // data sub-chunk
    header.write('data', offset); offset += 4;
    header.writeUInt32LE(dataSize, offset);

    // Combine header and PCM data
    return Buffer.concat([header, pcmBuffer]);
  }
}