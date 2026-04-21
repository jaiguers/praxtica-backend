import { Document, Types } from 'mongoose';
export declare const LANGUAGES: readonly ["english", "spanish"];
export declare const CEFR_LEVELS: readonly ["A1", "A2", "B1", "B2", "C1", "C2"];
export declare const AUTH_PROVIDERS: readonly ["github", "gmail", "outlook"];
export type Language = (typeof LANGUAGES)[number];
export type CefrLevel = (typeof CEFR_LEVELS)[number];
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];
export declare class PronunciationFeedback {
    score: number;
    mispronouncedWords: {
        word: string;
        attempts: number;
        lastHeard: Date;
        ipa?: string;
        notes?: string;
    }[];
}
export declare class GrammarFeedback {
    score: number;
    errors: {
        type: string;
        example?: string;
        correction?: string;
        notes?: string;
    }[];
}
export declare class VocabularyFeedback {
    score: number;
    rareWordsUsed: string[];
    repeatedWords: string[];
    suggestedWords: string[];
}
export declare class FluencyFeedback {
    score: number;
    wordsPerMinute: number;
    nativeRange?: {
        min: number;
        max: number;
    };
    pausesPerMinute: number;
    fillerWordsCount?: number;
    fillerWordsRatio?: number;
    mostUsedWords?: {
        word: string;
        count: number;
    }[];
}
export declare const PronunciationFeedbackSchema: import("mongoose").Schema<PronunciationFeedback, import("mongoose").Model<PronunciationFeedback, any, any, any, Document<unknown, any, PronunciationFeedback> & PronunciationFeedback & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PronunciationFeedback, Document<unknown, {}, import("mongoose").FlatRecord<PronunciationFeedback>> & import("mongoose").FlatRecord<PronunciationFeedback> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare const GrammarFeedbackSchema: import("mongoose").Schema<GrammarFeedback, import("mongoose").Model<GrammarFeedback, any, any, any, Document<unknown, any, GrammarFeedback> & GrammarFeedback & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, GrammarFeedback, Document<unknown, {}, import("mongoose").FlatRecord<GrammarFeedback>> & import("mongoose").FlatRecord<GrammarFeedback> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare const VocabularyFeedbackSchema: import("mongoose").Schema<VocabularyFeedback, import("mongoose").Model<VocabularyFeedback, any, any, any, Document<unknown, any, VocabularyFeedback> & VocabularyFeedback & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, VocabularyFeedback, Document<unknown, {}, import("mongoose").FlatRecord<VocabularyFeedback>> & import("mongoose").FlatRecord<VocabularyFeedback> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare const FluencyFeedbackSchema: import("mongoose").Schema<FluencyFeedback, import("mongoose").Model<FluencyFeedback, any, any, any, Document<unknown, any, FluencyFeedback> & FluencyFeedback & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, FluencyFeedback, Document<unknown, {}, import("mongoose").FlatRecord<FluencyFeedback>> & import("mongoose").FlatRecord<FluencyFeedback> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class LanguageTest {
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
export declare class PracticeSession {
    _id?: Types.ObjectId;
    startedAt: Date;
    endedAt?: Date;
    language: Language;
    level?: CefrLevel;
    durationSeconds: number;
    topics: string[];
    pronunciation: PronunciationFeedback;
    grammar: GrammarFeedback;
    vocabulary: VocabularyFeedback;
    fluency: FluencyFeedback;
    completed: boolean;
    conversationLog?: {
        title?: string;
        transcript: {
            role: 'user' | 'assistant';
            text: string;
            timestamp: number;
        }[];
        audioUrls: {
            role: 'user' | 'assistant';
            url: string;
        }[];
    };
}
export declare const LanguageTestSchema: import("mongoose").Schema<LanguageTest, import("mongoose").Model<LanguageTest, any, any, any, Document<unknown, any, LanguageTest> & LanguageTest & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LanguageTest, Document<unknown, {}, import("mongoose").FlatRecord<LanguageTest>> & import("mongoose").FlatRecord<LanguageTest> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare const PracticeSessionSchema: import("mongoose").Schema<PracticeSession, import("mongoose").Model<PracticeSession, any, any, any, Document<unknown, any, PracticeSession> & PracticeSession & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PracticeSession, Document<unknown, {}, import("mongoose").FlatRecord<PracticeSession>> & import("mongoose").FlatRecord<PracticeSession> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class AuthProviderData {
    provider: AuthProvider;
    providerId: string;
    accessToken: string;
    refreshToken?: string;
    email: string;
    connectedAt: Date;
}
export declare const AuthProviderDataSchema: import("mongoose").Schema<AuthProviderData, import("mongoose").Model<AuthProviderData, any, any, any, Document<unknown, any, AuthProviderData> & AuthProviderData & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AuthProviderData, Document<unknown, {}, import("mongoose").FlatRecord<AuthProviderData>> & import("mongoose").FlatRecord<AuthProviderData> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export type UserDocument = User & Document;
export declare class User {
    _id: Types.ObjectId;
    githubId?: string;
    email: string;
    username: string;
    name?: string;
    avatarUrl?: string;
    githubAccessToken?: string;
    authProviders: Map<AuthProvider, {
        provider: AuthProvider;
        providerId: string;
        accessToken: string;
        refreshToken?: string;
        email: string;
        connectedAt: Date;
    }>;
    subscription: {
        plan: 'free' | 'monthly' | 'annual' | 'enterprise';
        startDate: Date;
        endDate: Date;
        seats?: number;
        active: boolean;
    };
    createdAt: Date;
    subscriptionDetails: {
        plan: 'free' | 'monthly' | 'annual' | 'enterprise';
        startDate: Date;
        endDate: Date;
        seats?: number;
        active: boolean;
    };
    challengeProgress: {
        challengeId: string;
        language: string;
        currentStep: number;
        completedSteps: number[];
        startedAt: Date;
        lastUpdated: Date;
    }[];
    ranking: number;
    languageTests: Map<Language, {
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
    }>;
    practiceSessions: PracticeSession[];
    currentLevels: Map<Language, {
        level: CefrLevel;
        lastUpdated: Date;
        source: 'test' | 'practice' | 'manual';
    }>;
}
export declare const UserSchema: import("mongoose").Schema<User, import("mongoose").Model<User, any, any, any, Document<unknown, any, User> & User & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, User, Document<unknown, {}, import("mongoose").FlatRecord<User>> & import("mongoose").FlatRecord<User> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
