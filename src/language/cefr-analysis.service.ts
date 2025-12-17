import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { Language, CefrLevel } from '../schemas/user.schema';
import { StoredMessage } from './redis-storage.service';
import { PracticeFeedbackAggregate } from './language-analytics.service';

export interface CefrAnalysisResult {
  level: CefrLevel;
  feedback: PracticeFeedbackAggregate;
  confidence: number;
  analysisNotes: string;
}

@Injectable()
export class CefrAnalysisService {
  private readonly logger = new Logger(CefrAnalysisService.name);
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Analyze conversation messages and determine CEFR level with detailed feedback
   */
  async analyzeCefrLevel(
    language: Language,
    messages: StoredMessage[],
    sessionDurationSeconds: number,
  ): Promise<CefrAnalysisResult> {
    this.logger.log(`Iniciando análisis CEFR para idioma ${language} con ${messages.length} mensajes`);

    // Extract user messages and audio
    const userMessages = messages.filter(msg => msg.role === 'user');
    const userAudioChunks = userMessages
      .map(msg => msg.audioBase64)
      .filter(audio => audio && audio.length > 0);

    this.logger.log(`📊 Extracted ${userAudioChunks.length} user audio chunks for analysis (total size: ${userAudioChunks.join('').length} base64 chars)`);

    // Calculate basic fluency metrics
    const totalWords = userMessages.reduce((count, msg) => {
      return count + (msg.text ? msg.text.split(' ').length : 0);
    }, 0);

    const wordsPerMinute = sessionDurationSeconds > 0 
      ? (totalWords / sessionDurationSeconds) * 60 
      : 0;

    this.logger.log(`🗣️ Fluency calculation: ${totalWords} words in ${sessionDurationSeconds}s = ${wordsPerMinute.toFixed(1)} WPM`);

    // Prepare conversation transcript for analysis
    const conversationText = messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.text}`)
      .join('\n');

    // Log what we're sending to OpenAI for evaluation
    this.logger.log(`📤 Sending to OpenAI for CEFR evaluation:`);
    this.logger.log(`   Language: ${language}`);
    this.logger.log(`   Total messages: ${messages.length}`);
    this.logger.log(`   User messages: ${userMessages.length}`);
    this.logger.log(`   Assistant messages: ${messages.filter(m => m.role === 'assistant').length}`);
    this.logger.log(`   Conversation transcript:\n${conversationText}`);

    // Create analysis prompt
    const analysisPrompt = this.createAnalysisPrompt(language, conversationText, wordsPerMinute);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: analysisPrompt,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const analysisResult = JSON.parse(response.choices[0].message.content || '{}');
      
      this.logger.log(`CEFR analysis completed. Level determined: ${analysisResult.level}`);

      return {
        level: analysisResult.level || 'A1',
        feedback: this.mapToFeedbackStructure(analysisResult.feedback, wordsPerMinute),
        confidence: analysisResult.confidence || 0.5,
        analysisNotes: analysisResult.notes || 'Analysis completed',
      };

    } catch (error) {
      this.logger.error('Error during CEFR analysis:', error);
      
      // Return fallback analysis
      return {
        level: 'A1',
        feedback: this.createFallbackFeedback(wordsPerMinute),
        confidence: 0.1,
        analysisNotes: 'Analysis failed, using fallback assessment',
      };
    }
  }

  private createAnalysisPrompt(language: Language, conversationText: string, wordsPerMinute: number): string {
    const languageName = language === 'english' ? 'English' : 'Spanish';
    
    return `You are an expert ${languageName} language assessor specializing in CEFR (Common European Framework of Reference) evaluation.

Analyze the following conversation and provide a comprehensive CEFR assessment. The user spoke at ${wordsPerMinute.toFixed(1)} words per minute.

CONVERSATION:
${conversationText}

Provide your analysis as a JSON object with this exact structure:
{
  "level": "A1|A2|B1|B2|C1|C2",
  "confidence": 0.0-1.0,
  "feedback": {
    "pronunciation": {
      "score": 0-100,
      "mispronouncedWords": [
        {
          "word": "example",
          "attempts": 1,
          "lastHeard": "${new Date().toISOString()}",
          "ipa": "ɪɡˈzæmpəl",
          "notes": "Difficulty with vowel sounds"
        }
      ]
    },
    "grammar": {
      "score": 0-100,
      "errors": [
        {
          "type": "verb_tense",
          "example": "I go yesterday",
          "correction": "I went yesterday",
          "notes": "Past tense confusion"
        }
      ]
    },
    "vocabulary": {
      "score": 0-100,
      "rareWordsUsed": ["sophisticated", "elaborate"],
      "repeatedWords": ["very", "good"],
      "suggestedWords": ["excellent", "remarkable"]
    },
    "fluency": {
      "score": 0-100,
      "wordsPerMinute": ${wordsPerMinute},
      "nativeRange": {"min": 120, "max": 180},
      "pausesPerMinute": 5
    }
  },
  "notes": "Detailed assessment notes explaining the level determination"
}

CEFR Level Guidelines:
- A1: Basic phrases, present tense, simple vocabulary, 60-90 WPM
- A2: Simple past/future, basic conversations, 80-110 WPM  
- B1: Complex sentences, opinions, 100-130 WPM
- B2: Abstract topics, nuanced expression, 120-150 WPM
- C1: Sophisticated language, subtle meanings, 140-170 WPM
- C2: Native-like fluency and complexity, 160-200 WPM

Focus on grammar accuracy, vocabulary range, sentence complexity, and fluency. Be precise and constructive in your feedback.`;
  }

  private mapToFeedbackStructure(feedbackData: any, wordsPerMinute: number): PracticeFeedbackAggregate {
    return {
      pronunciation: {
        score: feedbackData?.pronunciation?.score || 50,
        mispronouncedWords: (feedbackData?.pronunciation?.mispronouncedWords || []).map((word: any) => ({
          word: word.word || '',
          attempts: word.attempts || 1,
          lastHeard: new Date(word.lastHeard || Date.now()),
          ipa: word.ipa,
          notes: word.notes,
        })),
      },
      grammar: {
        score: feedbackData?.grammar?.score || 50,
        errors: (feedbackData?.grammar?.errors || []).map((error: any) => ({
          type: error.type || 'unknown',
          example: error.example,
          correction: error.correction,
          notes: error.notes,
        })),
      },
      vocabulary: {
        score: feedbackData?.vocabulary?.score || 50,
        rareWordsUsed: feedbackData?.vocabulary?.rareWordsUsed || [],
        repeatedWords: feedbackData?.vocabulary?.repeatedWords || [],
        suggestedWords: feedbackData?.vocabulary?.suggestedWords || [],
      },
      fluency: {
        score: feedbackData?.fluency?.score || 50,
        wordsPerMinute: wordsPerMinute,
        nativeRange: feedbackData?.fluency?.nativeRange || { min: 100, max: 150 },
        pausesPerMinute: feedbackData?.fluency?.pausesPerMinute || 0,
      },
    };
  }

  private createFallbackFeedback(wordsPerMinute: number): PracticeFeedbackAggregate {
    return {
      pronunciation: {
        score: 50,
        mispronouncedWords: [],
      },
      grammar: {
        score: 50,
        errors: [],
      },
      vocabulary: {
        score: 50,
        rareWordsUsed: [],
        repeatedWords: [],
        suggestedWords: [],
      },
      fluency: {
        score: 50,
        wordsPerMinute,
        nativeRange: { min: 100, max: 150 },
        pausesPerMinute: 0,
      },
    };
  }
}