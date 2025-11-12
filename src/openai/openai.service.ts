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

export type ToeflSectionType = 'reading' | 'listening' | 'speaking' | 'writing';

export interface ToeflAnswerChoice {
  label: string;
  text: string;
  correct?: boolean;
}

export interface ToeflQuestion {
  id: string;
  prompt: string;
  questionType: 'multiple_choice' | 'short_answer' | 'essay' | 'speaking';
  difficulty: 'easy' | 'medium' | 'hard';
  passageReference?: string;
  audioReference?: string;
  answerChoices?: ToeflAnswerChoice[];
  evaluationCriteria: string[];
  expectedResponseTimeSeconds: number;
  sampleAnswer?: string;
}

export interface ToeflSection {
  id: string;
  type: ToeflSectionType;
  title: string;
  durationMinutes: number;
  instructions: string;
  passages?: string[];
  audioPrompts?: string[];
  questions: ToeflQuestion[];
}

export interface ToeflTestBlueprint {
  metadata: {
    testName: string;
    level: CefrLevel;
    variant: 'full' | 'short';
    topics: string[];
    totalDurationMinutes: number;
    skillsCovered: ToeflSectionType[];
  };
  sections: ToeflSection[];
  scoringGuidelines: {
    overallRubric: string[];
    sectionRubrics: Record<ToeflSectionType, string[]>;
    retakeAdvice: string[];
  };
}

export interface GenerateToeflTestOptions {
  level?: CefrLevel;
  topics?: string[];
  focusSkills?: ToeflSectionType[];
  variant?: 'full' | 'short';
  includeRubric?: boolean;
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI;
  private readonly grammarModel =
    process.env.OPENAI_GRAMMAR_MODEL ?? 'gpt-4.1-mini';
  private readonly toeflModel =
    process.env.OPENAI_TOEFL_MODEL ?? 'gpt-4.1';

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
      temperature: 0.2,
      text: {
        format: schema,
      },
    });

    return this.extractJson<GrammarCheckResponse>(response);
  }

  async generateToeflTest(
    options: GenerateToeflTestOptions,
  ): Promise<ToeflTestBlueprint> {
    const schema = this.buildToeflSchema();
    const payload = {
      level: options.level ?? 'auto-placement',
      variant: options.variant ?? 'short',
      topics: options.topics ?? [],
      focusSkills: options.focusSkills ?? [
        'reading',
        'listening',
        'speaking',
        'writing',
      ],
      includeRubric: options.includeRubric ?? true,
      targetDurationMinutes: 4,
      scoringDimensions: ['grammar', 'fluency', 'pronunciation', 'vocabulary'],
    };

    const request = [
      'Generate a TOEFL-style assessment in English following ETS methodology.',
      'The assessment must act as a placement test: questions should adapt from A1 to C2 difficulty.',
      'Total duration must be approximately 4 minutes for the whole test.',
      'Ensure scoring captures grammar, fluency, pronunciation, and vocabulary distinctly.',
      'Use the following configuration JSON to tailor the sections:',
      JSON.stringify(payload, null, 2),
      'Return ONLY the JSON required by the schema.',
    ].join('\n\n');

    const response = await this.openai.responses.create({
      model: this.toeflModel,
      instructions:
        'You are an expert TOEFL test designer. Always align content to CEFR guidance and ensure balanced difficulty.',
      input: request,
      temperature: 0.6,
      max_output_tokens: 1200,
      text: {
        format: schema,
      },
    });

    return this.extractJson<ToeflTestBlueprint>(response);
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

  private buildToeflSchema() {
    const rubricArraySchema = {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
    };

      return {
      type: 'json_schema' as const,
      name: 'toefl_test_blueprint',
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
              level: { type: 'string' },
              variant: { type: 'string', enum: ['full', 'short'] },
              topics: {
                type: 'array',
                items: { type: 'string' },
                minItems: 0,
              },
                totalDurationMinutes: { type: 'number' },
                targetDurationMinutes: { type: 'number' },
                scoringDimensions: {
                  type: 'array',
                  items: { type: 'string' },
                },
              skillsCovered: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['reading', 'listening', 'speaking', 'writing'],
                },
                minItems: 1,
              },
            },
            required: [
              'testName',
              'level',
              'variant',
              'topics',
              'totalDurationMinutes',
              'targetDurationMinutes',
              'scoringDimensions',
              'skillsCovered',
            ],
          },
          sections: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string' },
                type: {
                  type: 'string',
                  enum: ['reading', 'listening', 'speaking', 'writing'],
                },
                title: { type: 'string' },
                durationMinutes: { type: 'number' },
                instructions: { type: 'string' },
                passages: {
                  type: 'array',
                  items: { type: 'string' },
                },
                audioPrompts: {
                  type: 'array',
                  items: { type: 'string' },
                },
                questions: {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      id: { type: 'string' },
                      prompt: { type: 'string' },
                      questionType: {
                        type: 'string',
                        enum: [
                          'multiple_choice',
                          'short_answer',
                          'essay',
                          'speaking',
                        ],
                      },
                      difficulty: {
                        type: 'string',
                        enum: ['easy', 'medium', 'hard'],
                      },
                      passageReference: { type: 'string' },
                      audioReference: { type: 'string' },
                      answerChoices: {
                        type: 'array',
                        items: {
                          type: 'object',
                          additionalProperties: false,
                          properties: {
                            label: { type: 'string' },
                            text: { type: 'string' },
                            correct: { type: 'boolean' },
                          },
                          required: ['label', 'text'],
                        },
                      },
                      evaluationCriteria: rubricArraySchema,
                      expectedResponseTimeSeconds: { type: 'number' },
                      sampleAnswer: { type: 'string' },
                    },
                    required: [
                      'id',
                      'prompt',
                      'questionType',
                      'difficulty',
                      'evaluationCriteria',
                      'expectedResponseTimeSeconds',
                    ],
                  },
                },
              },
              required: [
                'id',
                'type',
                'title',
                'durationMinutes',
                'instructions',
                'questions',
              ],
            },
          },
          scoringGuidelines: {
            type: 'object',
            additionalProperties: false,
            properties: {
              overallRubric: rubricArraySchema,
              sectionRubrics: {
                type: 'object',
                additionalProperties: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              retakeAdvice: rubricArraySchema,
            },
            required: ['overallRubric', 'sectionRubrics', 'retakeAdvice'],
          },
        },
        required: ['metadata', 'sections', 'scoringGuidelines'],
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