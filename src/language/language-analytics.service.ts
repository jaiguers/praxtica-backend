import { Injectable } from '@nestjs/common';
import { CefrLevel, Language } from '../schemas/user.schema';
import { CompletePracticeSessionDto } from './dto/complete-practice-session.dto';

export interface PracticeFeedbackAggregate {
  pronunciation: {
    score: number;
    mispronouncedWords: {
      word: string;
      attempts: number;
      lastHeard: Date;
      ipa?: string;
      notes?: string;
    }[];
  };
  grammar: {
    score: number;
    errors: {
      type: string;
      example?: string;
      correction?: string;
      notes?: string;
    }[];
  };
  vocabulary: {
    score: number;
    rareWordsUsed: string[];
    repeatedWords: string[];
    suggestedWords: string[];
  };
  fluency: {
    score: number;
    wordsPerMinute: number;
    nativeRange: { min: number; max: number };
    pausesPerMinute: number;
    fillerWordsCount?: number;
    fillerWordsRatio?: number;
    mostUsedWords?: { word: string; count: number }[];
  };
}

export interface PracticeAnalyticsResult {
  feedback: PracticeFeedbackAggregate;
  conversationLog?: {
    title?: string;
    transcript?: {
      role: 'user' | 'assistant';
      text: string;
      timestamp: number;
    }[];
    audioUrls?: {
      role: 'user' | 'assistant';
      url: string;
    }[];
  };
  metrics: {
    averageScore: number;
    recommendedLevel: CefrLevel;
    fluencyRatio: number;
  };
}

@Injectable()
export class LanguageAnalyticsService {
  private readonly cefrOrder: CefrLevel[] = [
    'A1',
    'A2',
    'B1',
    'B2',
    'C1',
    'C2',
  ];

  createInitialFeedback(
    _language: Language,
    level: CefrLevel,
  ): PracticeFeedbackAggregate {
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

  analyzeCompletion(
    dto: CompletePracticeSessionDto,
    extractedLevel?: CefrLevel,
  ): PracticeAnalyticsResult {
    // Check if feedback exists, if not create default feedback
    const feedback = dto.feedback ? this.normalizeFeedback(dto) : this.createInitialFeedback(dto.language, dto.level || 'A1');
    const averageScore =
      (feedback.pronunciation.score +
        feedback.grammar.score +
        feedback.vocabulary.score +
        feedback.fluency.score) /
      4;

    // Use extracted level if available, otherwise use recommendation based on scores
    const recommendedLevel = extractedLevel || this.recommendLevel(dto.level, averageScore);
    const fluencyMidpoint =
      (feedback.fluency.nativeRange.min + feedback.fluency.nativeRange.max) / 2;
    const fluencyRatio =
      feedback.fluency.wordsPerMinute === 0
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

  private normalizeFeedback(
    dto: CompletePracticeSessionDto,
  ): PracticeFeedbackAggregate {
    if (!dto.feedback) {
      throw new Error('Feedback is required for normalizeFeedback method');
    }

    const fallback = this.createInitialFeedback(dto.language, dto.level || 'A1');
    const pronunciation = dto.feedback.pronunciation;
    const grammar = dto.feedback.grammar;
    const vocabulary = dto.feedback.vocabulary;
    const fluency = dto.feedback.fluency;

    return {
      pronunciation: {
        score: pronunciation?.score ?? fallback.pronunciation.score,
        mispronouncedWords: (pronunciation?.mispronouncedWords ?? []).map(
          (word) => ({
            ...word,
            lastHeard: new Date(word.lastHeard),
          }),
        ),
      },
      grammar: {
        score: grammar?.score ?? fallback.grammar.score,
        errors: (grammar?.errors ?? []).map((error) => ({ ...error })),
      },
      vocabulary: {
        score: vocabulary?.score ?? fallback.vocabulary.score,
        rareWordsUsed: vocabulary?.rareWordsUsed ?? [],
        repeatedWords: vocabulary?.repeatedWords ?? [],
        suggestedWords: vocabulary?.suggestedWords ?? [],
      },
      fluency: {
        score: fluency?.score ?? fallback.fluency.score,
        wordsPerMinute: fluency?.wordsPerMinute ?? fallback.fluency.wordsPerMinute,
        nativeRange: {
          min: fluency?.nativeRange?.min ?? fallback.fluency.nativeRange.min,
          max: fluency?.nativeRange?.max ?? fallback.fluency.nativeRange.max,
        },
        pausesPerMinute: fluency?.pausesPerMinute ?? fallback.fluency.pausesPerMinute,
        fillerWordsCount: fluency?.fillerWordsCount ?? fallback.fluency.fillerWordsCount,
        fillerWordsRatio: fluency?.fillerWordsRatio ?? fallback.fluency.fillerWordsRatio,
        mostUsedWords: fluency?.mostUsedWords ?? fallback.fluency.mostUsedWords,
      },
    };
  }

  private recommendLevel(
    currentLevel: CefrLevel,
    averageScore: number,
  ): CefrLevel {
    const index = this.cefrOrder.indexOf(currentLevel);
    if (averageScore >= 85 && index < this.cefrOrder.length - 1) {
      return this.cefrOrder[index + 1];
    }
    if (averageScore <= 45 && index > 0) {
      return this.cefrOrder[index - 1];
    }
    return currentLevel;
  }

  private getNativeRange(level: CefrLevel): { min: number; max: number } {
    const baseRanges: Record<CefrLevel, { min: number; max: number }> = {
      A1: { min: 60, max: 90 },
      A2: { min: 80, max: 110 },
      B1: { min: 100, max: 130 },
      B2: { min: 120, max: 150 },
      C1: { min: 140, max: 170 },
      C2: { min: 160, max: 200 },
    };
    return baseRanges[level];
  }
}

