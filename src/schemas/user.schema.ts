import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export const LANGUAGES = ['english', 'spanish'] as const;
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type Language = (typeof LANGUAGES)[number];
export type CefrLevel = (typeof CEFR_LEVELS)[number];

@Schema({ _id: false })
export class PronunciationFeedback {
  @Prop({ min: 0, max: 100, required: true })
  score: number;

  @Prop({
    type: [
      {
        word: { type: String, required: true },
        attempts: { type: Number, min: 1, default: 1 },
        lastHeard: { type: Date, default: Date.now },
        ipa: { type: String },
        notes: { type: String },
      },
    ],
    default: [],
  })
  mispronouncedWords: {
    word: string;
    attempts: number;
    lastHeard: Date;
    ipa?: string;
    notes?: string;
  }[];
}

@Schema({ _id: false })
export class GrammarFeedback {
  @Prop({ min: 0, max: 100, required: true })
  score: number;

  @Prop({
    type: [
      {
        type: { type: String, required: true },
        example: { type: String },
        correction: { type: String },
        notes: { type: String },
      },
    ],
    default: [],
  })
  errors: {
    type: string;
    example?: string;
    correction?: string;
    notes?: string;
  }[];
}

@Schema({ _id: false })
export class VocabularyFeedback {
  @Prop({ min: 0, max: 100, required: true })
  score: number;

  @Prop({ type: [String], default: [] })
  rareWordsUsed: string[];

  @Prop({ type: [String], default: [] })
  repeatedWords: string[];

  @Prop({ type: [String], default: [] })
  suggestedWords: string[];
}

@Schema({ _id: false })
export class FluencyFeedback {
  @Prop({ min: 0, max: 100, required: true })
  score: number;

  @Prop({ min: 0, required: true })
  wordsPerMinute: number;

  @Prop({
    type: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    required: true,
  })
  nativeRange: { min: number; max: number };

  @Prop({ min: 0, required: true })
  pausesPerMinute: number;
}

export const PronunciationFeedbackSchema = SchemaFactory.createForClass(
  PronunciationFeedback,
);
export const GrammarFeedbackSchema =
  SchemaFactory.createForClass(GrammarFeedback);
export const VocabularyFeedbackSchema = SchemaFactory.createForClass(
  VocabularyFeedback,
);
export const FluencyFeedbackSchema =
  SchemaFactory.createForClass(FluencyFeedback);

@Schema({ _id: false })
export class LanguageTest {
  @Prop({ required: true, enum: LANGUAGES })
  language: Language;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true, enum: CEFR_LEVELS })
  level: CefrLevel;

  @Prop({ min: 0, max: 120 })
  score?: number;

  @Prop({
    type: {
      grammar: { type: Number, min: 0, max: 100, required: true },
      pronunciation: { type: Number, min: 0, max: 100, required: true },
      vocabulary: { type: Number, min: 0, max: 100, required: true },
      fluency: { type: Number, min: 0, max: 100, required: true },
      listening: { type: Number, min: 0, max: 100 },
      reading: { type: Number, min: 0, max: 100 },
    },
    required: true,
  })
  breakdown: {
    grammar: number;
    pronunciation: number;
    vocabulary: number;
    fluency: number;
    listening?: number;
    reading?: number;
  };

  @Prop({
    type: {
      promptSeed: String,
      aiModel: String,
      durationSeconds: Number,
      notes: String,
      attachments: [{ url: String, kind: String }],
    },
  })
  metadata?: {
    promptSeed?: string;
    aiModel?: string;
    durationSeconds?: number;
    notes?: string;
    attachments?: { url: string; kind: 'audio' | 'transcript' | 'screenshot' }[];
  };
}

@Schema({ _id: false })
export class PracticeSession {
  _id?: Types.ObjectId;

  @Prop({ required: true })
  startedAt: Date;

  @Prop()
  endedAt?: Date;

  @Prop({ required: true, enum: LANGUAGES })
  language: Language;

  @Prop({ required: true, enum: CEFR_LEVELS })
  level: CefrLevel;

  @Prop({ min: 0, default: 0 })
  durationSeconds: number;

  @Prop({ type: [String], default: [] })
  topics: string[];

  @Prop({ type: PronunciationFeedbackSchema, required: true })
  pronunciation: PronunciationFeedback;

  @Prop({ type: GrammarFeedbackSchema, required: true })
  grammar: GrammarFeedback;

  @Prop({ type: VocabularyFeedbackSchema, required: true })
  vocabulary: VocabularyFeedback;

  @Prop({ type: FluencyFeedbackSchema, required: true })
  fluency: FluencyFeedback;

  @Prop({ default: false })
  completed: boolean;

  @Prop({
    type: {
      transcript: [
        {
          role: { type: String, enum: ['user', 'assistant'], required: true },
          text: { type: String, required: true },
          timestamp: { type: Number, required: true },
        },
      ],
      audioUrls: [
        {
          role: { type: String, enum: ['user', 'assistant'], required: true },
          url: { type: String, required: true },
        },
      ],
    },
  })
  conversationLog?: {
    transcript: { role: 'user' | 'assistant'; text: string; timestamp: number }[];
    audioUrls: { role: 'user' | 'assistant'; url: string }[];
  };
}

export const LanguageTestSchema = SchemaFactory.createForClass(LanguageTest);
export const PracticeSessionSchema =
  SchemaFactory.createForClass(PracticeSession);

export type UserDocument = User & Document;

@Schema()
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true })
  githubId: string;

  @Prop({ required: true })
  username: string;

  @Prop()
  email: string;

  @Prop()
  name?: string;

  @Prop()
  avatarUrl: string;

  @Prop()
  githubAccessToken: string;

  @Prop({
    type: Object,
    default: {
      plan: 'free',
      startDate: () => new Date(),
      endDate: () => new Date(),
      active: true,
    },
  })
  subscription: {
    plan: 'free' | 'monthly' | 'annual' | 'enterprise';
    startDate: Date;
    endDate: Date;
    seats?: number; // Para plan enterprise
    active: boolean;
  };

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ type: Object })
  subscriptionDetails: {
    plan: 'free' | 'monthly' | 'annual' | 'enterprise';
    startDate: Date;
    endDate: Date;
    seats?: number;
    active: boolean;
  };

  @Prop({ type: [{ type: Object }] })
  challengeProgress: {
    challengeId: string;
    language: string;
    currentStep: number;
    completedSteps: number[];
    startedAt: Date;
    lastUpdated: Date;
  }[];

  @Prop({ default: 1 })
  ranking: number;

  @Prop({
    type: Map,
    of: LanguageTestSchema,
    default: {},
  })
  languageTests: Map<
    Language,
    {
      language: Language;
      date: Date;
      level: CefrLevel;
      score?: number;
      breakdown: {
        grammar: number;
        pronunciation: number;
        vocabulary: number;
        fluency: number;
        listening?: number;
        reading?: number;
      };
      metadata?: {
        promptSeed?: string;
        aiModel?: string;
        durationSeconds?: number;
        notes?: string;
        attachments?: {
          url: string;
          kind: 'audio' | 'transcript' | 'screenshot';
        }[];
      };
    }
  >;

  @Prop({
    type: [PracticeSessionSchema],
    default: [],
  })
  practiceSessions: PracticeSession[];

  @Prop({
    type: Map,
    of: {
      level: { type: String, enum: CEFR_LEVELS, required: true },
      lastUpdated: { type: Date, default: Date.now },
      source: {
        type: String,
        enum: ['test', 'practice', 'manual'],
        default: 'test',
      },
    },
    default: {},
  })
  currentLevels: Map<
    Language,
    { level: CefrLevel; lastUpdated: Date; source: 'test' | 'practice' | 'manual' }
  >;
}

export const UserSchema = SchemaFactory.createForClass(User); 