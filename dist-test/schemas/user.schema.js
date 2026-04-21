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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSchema = exports.User = exports.AuthProviderDataSchema = exports.AuthProviderData = exports.PracticeSessionSchema = exports.LanguageTestSchema = exports.PracticeSession = exports.LanguageTest = exports.FluencyFeedbackSchema = exports.VocabularyFeedbackSchema = exports.GrammarFeedbackSchema = exports.PronunciationFeedbackSchema = exports.FluencyFeedback = exports.VocabularyFeedback = exports.GrammarFeedback = exports.PronunciationFeedback = exports.AUTH_PROVIDERS = exports.CEFR_LEVELS = exports.LANGUAGES = void 0;
const mongoose_1 = require("@nestjs/mongoose");
exports.LANGUAGES = ['english', 'spanish'];
exports.CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
exports.AUTH_PROVIDERS = ['github', 'gmail', 'outlook'];
let PronunciationFeedback = class PronunciationFeedback {
};
exports.PronunciationFeedback = PronunciationFeedback;
__decorate([
    (0, mongoose_1.Prop)({ min: 0, max: 100, required: true }),
    __metadata("design:type", Number)
], PronunciationFeedback.prototype, "score", void 0);
__decorate([
    (0, mongoose_1.Prop)({
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
    }),
    __metadata("design:type", Array)
], PronunciationFeedback.prototype, "mispronouncedWords", void 0);
exports.PronunciationFeedback = PronunciationFeedback = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], PronunciationFeedback);
let GrammarFeedback = class GrammarFeedback {
};
exports.GrammarFeedback = GrammarFeedback;
__decorate([
    (0, mongoose_1.Prop)({ min: 0, max: 100, required: true }),
    __metadata("design:type", Number)
], GrammarFeedback.prototype, "score", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [
            {
                type: { type: String, required: true },
                example: { type: String },
                correction: { type: String },
                notes: { type: String },
            },
        ],
        default: [],
    }),
    __metadata("design:type", Array)
], GrammarFeedback.prototype, "errors", void 0);
exports.GrammarFeedback = GrammarFeedback = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], GrammarFeedback);
let VocabularyFeedback = class VocabularyFeedback {
};
exports.VocabularyFeedback = VocabularyFeedback;
__decorate([
    (0, mongoose_1.Prop)({ min: 0, max: 100, required: true }),
    __metadata("design:type", Number)
], VocabularyFeedback.prototype, "score", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], VocabularyFeedback.prototype, "rareWordsUsed", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], VocabularyFeedback.prototype, "repeatedWords", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], VocabularyFeedback.prototype, "suggestedWords", void 0);
exports.VocabularyFeedback = VocabularyFeedback = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], VocabularyFeedback);
let FluencyFeedback = class FluencyFeedback {
};
exports.FluencyFeedback = FluencyFeedback;
__decorate([
    (0, mongoose_1.Prop)({ min: 0, max: 100, required: true }),
    __metadata("design:type", Number)
], FluencyFeedback.prototype, "score", void 0);
__decorate([
    (0, mongoose_1.Prop)({ min: 0, required: true }),
    __metadata("design:type", Number)
], FluencyFeedback.prototype, "wordsPerMinute", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            min: { type: Number },
            max: { type: Number },
        },
    }),
    __metadata("design:type", Object)
], FluencyFeedback.prototype, "nativeRange", void 0);
__decorate([
    (0, mongoose_1.Prop)({ min: 0, required: true }),
    __metadata("design:type", Number)
], FluencyFeedback.prototype, "pausesPerMinute", void 0);
__decorate([
    (0, mongoose_1.Prop)({ min: 0, default: 0 }),
    __metadata("design:type", Number)
], FluencyFeedback.prototype, "fillerWordsCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ min: 0, max: 1, default: 0 }),
    __metadata("design:type", Number)
], FluencyFeedback.prototype, "fillerWordsRatio", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [
            {
                word: { type: String, required: true },
                count: { type: Number, min: 1, required: true },
            },
        ],
        default: [],
    }),
    __metadata("design:type", Array)
], FluencyFeedback.prototype, "mostUsedWords", void 0);
exports.FluencyFeedback = FluencyFeedback = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], FluencyFeedback);
exports.PronunciationFeedbackSchema = mongoose_1.SchemaFactory.createForClass(PronunciationFeedback);
exports.GrammarFeedbackSchema = mongoose_1.SchemaFactory.createForClass(GrammarFeedback);
exports.VocabularyFeedbackSchema = mongoose_1.SchemaFactory.createForClass(VocabularyFeedback);
exports.FluencyFeedbackSchema = mongoose_1.SchemaFactory.createForClass(FluencyFeedback);
let LanguageTest = class LanguageTest {
};
exports.LanguageTest = LanguageTest;
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: exports.LANGUAGES }),
    __metadata("design:type", String)
], LanguageTest.prototype, "language", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], LanguageTest.prototype, "date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: exports.CEFR_LEVELS }),
    __metadata("design:type", String)
], LanguageTest.prototype, "level", void 0);
__decorate([
    (0, mongoose_1.Prop)({ min: 0, max: 120 }),
    __metadata("design:type", Number)
], LanguageTest.prototype, "score", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            grammar: { type: Number, min: 0, max: 100, required: true },
            pronunciation: { type: Number, min: 0, max: 100, required: true },
            vocabulary: { type: Number, min: 0, max: 100, required: true },
            fluency: { type: Number, min: 0, max: 100, required: true },
            listening: { type: Number, min: 0, max: 100 },
            reading: { type: Number, min: 0, max: 100 },
        },
        required: true,
    }),
    __metadata("design:type", Object)
], LanguageTest.prototype, "breakdown", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            promptSeed: String,
            aiModel: String,
            durationSeconds: Number,
            notes: String,
            attachments: [{ url: String, kind: String }],
        },
    }),
    __metadata("design:type", Object)
], LanguageTest.prototype, "metadata", void 0);
exports.LanguageTest = LanguageTest = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], LanguageTest);
let PracticeSession = class PracticeSession {
};
exports.PracticeSession = PracticeSession;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], PracticeSession.prototype, "startedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PracticeSession.prototype, "endedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: exports.LANGUAGES }),
    __metadata("design:type", String)
], PracticeSession.prototype, "language", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, enum: exports.CEFR_LEVELS }),
    __metadata("design:type", String)
], PracticeSession.prototype, "level", void 0);
__decorate([
    (0, mongoose_1.Prop)({ min: 0, default: 0 }),
    __metadata("design:type", Number)
], PracticeSession.prototype, "durationSeconds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], PracticeSession.prototype, "topics", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: exports.PronunciationFeedbackSchema, required: true }),
    __metadata("design:type", PronunciationFeedback)
], PracticeSession.prototype, "pronunciation", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: exports.GrammarFeedbackSchema, required: true }),
    __metadata("design:type", GrammarFeedback)
], PracticeSession.prototype, "grammar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: exports.VocabularyFeedbackSchema, required: true }),
    __metadata("design:type", VocabularyFeedback)
], PracticeSession.prototype, "vocabulary", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: exports.FluencyFeedbackSchema, required: true }),
    __metadata("design:type", FluencyFeedback)
], PracticeSession.prototype, "fluency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], PracticeSession.prototype, "completed", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            title: { type: String, required: false, default: '' },
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
    }),
    __metadata("design:type", Object)
], PracticeSession.prototype, "conversationLog", void 0);
exports.PracticeSession = PracticeSession = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], PracticeSession);
exports.LanguageTestSchema = mongoose_1.SchemaFactory.createForClass(LanguageTest);
exports.PracticeSessionSchema = mongoose_1.SchemaFactory.createForClass(PracticeSession);
let AuthProviderData = class AuthProviderData {
};
exports.AuthProviderData = AuthProviderData;
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: exports.AUTH_PROVIDERS }),
    __metadata("design:type", String)
], AuthProviderData.prototype, "provider", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AuthProviderData.prototype, "providerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AuthProviderData.prototype, "accessToken", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AuthProviderData.prototype, "refreshToken", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AuthProviderData.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], AuthProviderData.prototype, "connectedAt", void 0);
exports.AuthProviderData = AuthProviderData = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], AuthProviderData);
exports.AuthProviderDataSchema = mongoose_1.SchemaFactory.createForClass(AuthProviderData);
let User = class User {
};
exports.User = User;
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], User.prototype, "githubId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], User.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], User.prototype, "avatarUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], User.prototype, "githubAccessToken", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: Map,
        of: exports.AuthProviderDataSchema,
        default: {},
    }),
    __metadata("design:type", Map)
], User.prototype, "authProviders", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: Object,
        default: {
            plan: 'free',
            startDate: () => new Date(),
            endDate: () => new Date(),
            active: true,
        },
    }),
    __metadata("design:type", Object)
], User.prototype, "subscription", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], User.prototype, "subscriptionDetails", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ type: Object }] }),
    __metadata("design:type", Array)
], User.prototype, "challengeProgress", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], User.prototype, "ranking", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: Map,
        of: exports.LanguageTestSchema,
        default: {},
    }),
    __metadata("design:type", Map)
], User.prototype, "languageTests", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [exports.PracticeSessionSchema],
        default: [],
    }),
    __metadata("design:type", Array)
], User.prototype, "practiceSessions", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: Map,
        of: {
            level: { type: String, enum: exports.CEFR_LEVELS, required: true },
            lastUpdated: { type: Date, default: Date.now },
            source: {
                type: String,
                enum: ['test', 'practice', 'manual'],
                default: 'test',
            },
        },
        default: {},
    }),
    __metadata("design:type", Map)
], User.prototype, "currentLevels", void 0);
exports.User = User = __decorate([
    (0, mongoose_1.Schema)()
], User);
exports.UserSchema = mongoose_1.SchemaFactory.createForClass(User);
//# sourceMappingURL=user.schema.js.map