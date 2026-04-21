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
var OpenAIService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = require("openai");
let OpenAIService = OpenAIService_1 = class OpenAIService {
    constructor() {
        this.logger = new common_1.Logger(OpenAIService_1.name);
        this.grammarModel = process.env.OPENAI_GRAMMAR_MODEL ?? 'gpt-4o-mini';
        this.placementModel = process.env.OPENAI_PLACEMENT_MODEL ?? 'gpt-4o';
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    async checkGrammar(options) {
        const schema = this.buildGrammarSchema();
        const prompt = options.language === 'english'
            ? this.buildEnglishGrammarPrompt(options)
            : this.buildSpanishGrammarPrompt(options);
        const response = await this.openai.responses.create({
            model: this.grammarModel,
            instructions: 'You are a precise grammar and writing tutor. Always correct the input while preserving intention and tone.',
            input: prompt,
            temperature: 0.7,
            text: {
                format: schema,
            },
        });
        return this.extractJson(response);
    }
    async generateCefrPlacementTest(options) {
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
            instructions: 'You are an expert CEFR test designer. Create a fast, accurate placement test that clearly distinguishes between A1, A2, B1, B2, and C1 levels.',
            input: request,
            temperature: 0.7,
            max_output_tokens: 2000,
            text: {
                format: schema,
            },
        });
        return this.extractJson(response);
    }
    extractJson(response) {
        for (const item of response.output ?? []) {
            if ('content' in item && Array.isArray(item.content)) {
                for (const content of item.content) {
                    if (content?.type === 'output_text' && typeof content.text === 'string') {
                        try {
                            return JSON.parse(content.text);
                        }
                        catch (error) {
                            this.logger.warn('Failed to parse JSON output text', error);
                        }
                    }
                }
            }
        }
        this.logger.error('OpenAI response did not contain JSON payload');
        throw new Error('OpenAI response did not contain JSON payload');
    }
    buildGrammarSchema() {
        return {
            type: 'json_schema',
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
    buildCefrPlacementSchema() {
        return {
            type: 'json_schema',
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
    buildEnglishGrammarPrompt(options) {
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
    buildSpanishGrammarPrompt(options) {
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
};
exports.OpenAIService = OpenAIService;
exports.OpenAIService = OpenAIService = OpenAIService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], OpenAIService);
//# sourceMappingURL=openai.service.js.map