import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

export type ConversationRole = 'system' | 'user' | 'assistant';

export interface ConversationItem {
  role: ConversationRole;
  content: string;
}

export interface RealtimeResponseOptions {
  language: 'english' | 'spanish';
  voice?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface RealtimeStreamEvent {
  type: string;
  [key: string]: unknown;
}

@Injectable()
export class OpenAIRealtimeService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(OpenAIRealtimeService.name);
  private readonly defaultVoiceByLanguage: Record<string, string> = {
    english: process.env.OPENAI_VOICE_ENGLISH ?? 'alloy',
    spanish: process.env.OPENAI_VOICE_SPANISH ?? 'camila',
  };

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async streamResponse(
    conversation: ConversationItem[],
    options: RealtimeResponseOptions,
  ): Promise<
    AsyncIterable<RealtimeStreamEvent> & {
      finalResponse?: () => Promise<unknown>;
    }
  > {
    const voice =
      options.voice ?? this.defaultVoiceByLanguage[options.language] ?? 'alloy';
    const model =
      process.env.OPENAI_REALTIME_MODEL ?? 'gpt-4o-realtime-preview';

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

      return stream as unknown as AsyncIterable<RealtimeStreamEvent> & {
        finalResponse?: () => Promise<unknown>;
      };
    } catch (error) {
      this.logger.error('Error creating OpenAI realtime stream', error as Error);
      throw error;
    }
  }
}

