"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
let LanguageAnalyticsService = class LanguageAnalyticsService {
    constructor() {
        this.cefrOrder = [
            'A1',
            'A2',
            'B1',
            'B2',
            'C1',
            'C2',
        ];
    }
    createInitialFeedback(_language, level) {
        const nativeRange = this.getNativeRange(level);
        return {
            pronunciation: {
                score: 0,
                mispronouncedWords: [],
            },
            grammar: {
                score: 0,
                errors: [],
            },
            vocabulary: {
                score: 0,
                rareWordsUsed: [],
                repeatedWords: [],
                suggestedWords: [],
            },
            fluency: {
                score: 0,
                wordsPerMinute: 0,
                nativeRange,
                pausesPerMinute: 0,
                fillerWordsCount: 0,
                fillerWordsRatio: 0,
                mostUsedWords: [],
            },
        };
    }
    analyzeCompletion(dto, extractedLevel) {
        const feedback = dto.feedback ? this.normalizeFeedback(dto) : this.createInitialFeedback(dto.language, dto.level || 'A1');
        const averageScore = (feedback.pronunciation.score +
            feedback.grammar.score +
            feedback.vocabulary.score +
            feedback.fluency.score) /
            4;
        const recommendedLevel = extractedLevel || this.recommendLevel(dto.level, averageScore);
        const fluencyMidpoint = (feedback.fluency.nativeRange.min + feedback.fluency.nativeRange.max) / 2;
        const fluencyRatio = feedback.fluency.wordsPerMinute === 0
            ? 0
            : feedback.fluency.wordsPerMinute / fluencyMidpoint;
        const conversationLog = dto.conversationLog
            ? {
                title: dto.conversationLog.title,
                transcript: dto.conversationLog.transcript?.map((item) => ({
                    ...item,
                    timestamp: item.timestamp,
                })),
                audioUrls: dto.conversationLog.audioUrls?.map((item) => ({
                    ...item,
                })),
            }
            : undefined;
        return {
            feedback,
            conversationLog,
            metrics: {
                averageScore,
                recommendedLevel,
                fluencyRatio,
            },
        };
    }
    normalizeFeedback(dto) {
        if (!dto.feedback) {
            throw new Error('Feedback is required for normalizeFeedback method');
        }
        return {
            pronunciation: {
                score: dto.feedback.pronunciation.score,
                mispronouncedWords: dto.feedback.pronunciation.mispronouncedWords.map((word) => ({
                    ...word,
                    lastHeard: new Date(word.lastHeard),
                })),
            },
            grammar: {
                score: dto.feedback.grammar.score,
                errors: dto.feedback.grammar.errors.map((error) => ({ ...error })),
            },
            vocabulary: {
                score: dto.feedback.vocabulary.score,
                rareWordsUsed: dto.feedback.vocabulary.rareWordsUsed ?? [],
                repeatedWords: dto.feedback.vocabulary.repeatedWords ?? [],
                suggestedWords: dto.feedback.vocabulary.suggestedWords ?? [],
            },
            fluency: {
                score: dto.feedback.fluency.score,
                wordsPerMinute: dto.feedback.fluency.wordsPerMinute,
                nativeRange: {
                    min: dto.feedback.fluency.nativeRange.min,
                    max: dto.feedback.fluency.nativeRange.max,
                },
                pausesPerMinute: dto.feedback.fluency.pausesPerMinute,
                fillerWordsCount: dto.feedback.fluency.fillerWordsCount,
                fillerWordsRatio: dto.feedback.fluency.fillerWordsRatio,
                mostUsedWords: dto.feedback.fluency.mostUsedWords,
            },
        };
    }
    recommendLevel(currentLevel, averageScore) {
        const index = this.cefrOrder.indexOf(currentLevel);
        if (averageScore >= 85 && index < this.cefrOrder.length - 1) {
            return this.cefrOrder[index + 1];
        }
        if (averageScore <= 45 && index > 0) {
            return this.cefrOrder[index - 1];
        }
        return currentLevel;
    }
    getNativeRange(level) {
        const baseRanges = {
            A1: { min: 60, max: 90 },
            A2: { min: 80, max: 110 },
            B1: { min: 100, max: 130 },
            B2: { min: 120, max: 150 },
            C1: { min: 140, max: 170 },
            C2: { min: 160, max: 200 },
        };
        return baseRanges[level];
    }
};
exports.LanguageAnalyticsService = LanguageAnalyticsService;
exports.LanguageAnalyticsService = LanguageAnalyticsService = __decorate([
    (0, common_1.Injectable)()
], LanguageAnalyticsService);
//# sourceMappingURL=language-analytics.service.js.map