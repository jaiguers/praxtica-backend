import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { GrammarCheckResponse } from './interfaces/grammar-check.interface';
import { CefrLevel } from '../schemas/user.schema';

export type GrammarCheckLanguage = 'english' | 'spanish';

export interface CheckGrammarOptions {
  text: string;
  language: GrammarCheckLanguage;
  dialectHint?: string;
}

export type CefrPlacementSkill = 'speaking' | 'listening' | 'reading' | 'writing';

export interface CefrPlacementQuestion {
  id: string;
  prompt: string;
  questionType: 'speaking' | 'multiple_choice' | 'short_answer';
  targetLevels: CefrLevel[];
  expectedResponseTimeSeconds: number;
  audioPrompt?: string;
  answerChoices?: {
    label: string;
    text: string;
    targetLevel: CefrLevel;
  }[];
  evaluationCriteria: {
    grammar: string[];
    fluency: string[];
    pronunciation: string[];
    vocabulary: string[];
  };
}

export interface CefrPlacementTest {
  metadata: {
    testName: string;
    totalDurationMinutes: number;
    topics: string[];
  };
  questions: CefrPlacementQuestion[];
  scoringGuide: {
    howToScore: string;
    levelMapping: {
      [K in CefrLevel]?: {
        grammar: { min: number; max: number };
        fluency: { min: number; max: number };
        pronunciation: { min: number; max: number };
        vocabulary: { min: number; max: number };
      };
    };
  };
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI;
  private readonly grammarModel =
    process.env.OPENAI_GRAMMAR_MODEL ?? 'gpt-4o-mini';
  private readonly placementModel =
    process.env.OPENAI_PLACEMENT_MODEL ?? 'gpt-4o';

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async checkGrammar(options: CheckGrammarOptions): Promise<GrammarCheckResponse> {
    const schema = this.buildGrammarSchema();
    const prompt =
      options.language === 'english'
        ? this.buildEnglishGrammarPrompt(options)
        : this.buildSpanishGrammarPrompt(options);

    const response = await this.openai.responses.create({
      model: this.grammarModel,
      instructions:
        'You are a precise grammar and writing tutor. Always correct the input while preserving intention and tone.',
      input: prompt,
      temperature: 0.7,
      text: {
        format: schema,
      },
    });

    return this.extractJson<GrammarCheckResponse>(response);
  }

  async generateCefrPlacementTest(
    options: { topics?: string[] },
  ): Promise<CefrPlacementTest> {
    const schema = this.buildCefrPlacementSchema();
    const topics = options.topics?.length
      ? options.topics.join(', ')
      : 'general conversation, daily activities, work, hobbies';

    const request = [
      'Generate a CEFR placement test in English designed to quickly determine a learner\'s level (A1, A2, B1, B2, or C1).',
      'The test must be completed in exactly 4 minutes total.',
      'Focus on speaking and listening skills primarily, with some reading comprehension.',
      'Each question should target specific CEFR levels and help identify where the learner stands.',
      `Topics to cover: ${topics}`,
      'The test must evaluate four dimensions: grammar, fluency, pronunciation, and vocabulary.',
      'Questions should progressively increase in difficulty to pinpoint the exact level.',
      'Return ONLY the JSON required by the schema.',
    ].join('\n\n');

    const response = await this.openai.responses.create({
      model: this.placementModel,
      instructions:
        'You are an expert CEFR test designer. Create a fast, accurate placement test that clearly distinguishes between A1, A2, B1, B2, and C1 levels.',
      input: request,
      temperature: 0.7,
      max_output_tokens: 2000,
      text: {
        format: schema,
      },
    });

    return this.extractJson<CefrPlacementTest>(response);
  }

  private extractJson<T>(response: OpenAI.Responses.Response): T {
    for (const item of response.output ?? []) {
      if ('content' in item && Array.isArray((item as any).content)) {
        for (const content of (item as any).content) {
          if (content?.type === 'output_text' && typeof content.text === 'string') {
            try {
              return JSON.parse(content.text) as T;
            } catch (error) {
              this.logger.warn(
                'Failed to parse JSON output text',
                error as Error,
              );
            }
          }
        }
      }
    }
    this.logger.error('OpenAI response did not contain JSON payload');
    throw new Error('OpenAI response did not contain JSON payload');
  }

  private buildGrammarSchema() {
    return {
      type: 'json_schema' as const,
      name: 'grammar_feedback',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          correctedText: { type: 'string' },
          suggestions: {
            type: 'array',
            items: { type: 'string' },
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                type: { type: 'string' },
                message: { type: 'string' },
                suggestion: { type: 'string' },
              },
              required: ['type', 'message', 'suggestion'],
            },
          },
        },
        required: ['correctedText', 'suggestions', 'errors'],
      },
    };
  }

  private buildCefrPlacementSchema() {
    return {
      type: 'json_schema' as const,
      name: 'cefr_placement_test',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          metadata: {
            type: 'object',
            additionalProperties: false,
            properties: {
              testName: { type: 'string' },
              totalDurationMinutes: { type: 'number', const: 4 },
              topics: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['testName', 'totalDurationMinutes', 'topics'],
          },
          questions: {
            type: 'array',
            minItems: 3,
            maxItems: 8,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string' },
                prompt: { type: 'string' },
                questionType: {
                  type: 'string',
                  enum: ['speaking', 'multiple_choice', 'short_answer'],
                },
                targetLevels: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['A1', 'A2', 'B1', 'B2', 'C1'],
                  },
                  minItems: 1,
                },
                expectedResponseTimeSeconds: { type: 'number' },
                audioPrompt: { type: 'string' },
                answerChoices: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      label: { type: 'string' },
                      text: { type: 'string' },
                      targetLevel: {
                        type: 'string',
                        enum: ['A1', 'A2', 'B1', 'B2', 'C1'],
                      },
                    },
                    required: ['label', 'text', 'targetLevel'],
                  },
                },
                evaluationCriteria: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    grammar: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    fluency: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    pronunciation: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    vocabulary: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                  required: [
                    'grammar',
                    'fluency',
                    'pronunciation',
                    'vocabulary',
                  ],
                },
              },
              required: [
                'id',
                'prompt',
                'questionType',
                'targetLevels',
                'expectedResponseTimeSeconds',
                'evaluationCriteria',
              ],
            },
          },
          scoringGuide: {
            type: 'object',
            additionalProperties: false,
            properties: {
              howToScore: { type: 'string' },
              levelMapping: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    grammar: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        min: { type: 'number' },
                        max: { type: 'number' },
                      },
                      required: ['min', 'max'],
                    },
                    fluency: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        min: { type: 'number' },
                        max: { type: 'number' },
                      },
                      required: ['min', 'max'],
                    },
                    pronunciation: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        min: { type: 'number' },
                        max: { type: 'number' },
                      },
                      required: ['min', 'max'],
                    },
                    vocabulary: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        min: { type: 'number' },
                        max: { type: 'number' },
                      },
                      required: ['min', 'max'],
                    },
                  },
                  required: [
                    'grammar',
                    'fluency',
                    'pronunciation',
                    'vocabulary',
                  ],
                },
              },
            },
            required: ['howToScore', 'levelMapping'],
          },
        },
        required: ['metadata', 'questions', 'scoringGuide'],
      },
    };
  }

  private buildEnglishGrammarPrompt(options: CheckGrammarOptions): string {
    return [
      'Review the following English text. Return corrections and feedback.',
      `Text: """${options.text}"""`,
      options.dialectHint
        ? `The user writes in the ${options.dialectHint} dialect. Respect idioms when possible.`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildSpanishGrammarPrompt(options: CheckGrammarOptions): string {
    return [
      'Evalúa el siguiente texto en español. Devuelve correcciones y sugerencias.',
      `Texto: """${options.text}"""`,
      options.dialectHint
        ? `El usuario utiliza el dialecto ${options.dialectHint}. Conserva expresiones regionales cuando sea apropiado.`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
} 