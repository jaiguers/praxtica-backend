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
  extractedLevel?: CefrLevel; // Level extracted from AI response
  audioSuppressed?: boolean; // Whether audio was suppressed for evaluation
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
   * Extract CEFR level from AI evaluation response text
   */
  extractCefrLevelFromResponse(responseText: string): CefrLevel | null {
    if (!responseText) return null;

    // Patterns to detect CEFR level in evaluation responses
    const patterns = [
      /I believe you have a?n? ([ABC][12]) level/i,
      /your level is ([ABC][12])/i,
      /you are at a?n? ([ABC][12]) level/i,
      /([ABC][12]) level in (English|Spanish)/i,
      /determined to be ([ABC][12])/i,
      /assess you as ([ABC][12])/i,
      /place you at ([ABC][12])/i,
      /creo que tienes un nivel ([ABC][12])/i, // Spanish pattern
      /tu nivel es ([ABC][12])/i, // Spanish pattern
    ];

    for (const pattern of patterns) {
      const match = responseText.match(pattern);
      if (match && match[1]) {
        const level = match[1].toUpperCase() as CefrLevel;
        // Validate it's a valid CEFR level
        if (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level)) {
          this.logger.log(`🎯 Extracted CEFR level: ${level} from response: "${responseText.substring(0, 100)}..."`);
          return level;
        }
      }
    }

    this.logger.warn(`⚠️ Could not extract CEFR level from response: "${responseText.substring(0, 100)}..."`);
    return null;
  }

  /**
   * Check if a response text is a final evaluation response
   */
  isEvaluationResponse(responseText: string): boolean {
    if (!responseText) return false;

    const evaluationIndicators = [
      /based on our conversation/i,
      /I believe you have/i,
      /your level is/i,
      /thank you for taking the placement test/i,
      /assessment complete/i,
      /evaluation complete/i,
      /final assessment/i,
    ];

    return evaluationIndicators.some(pattern => pattern.test(responseText));
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
    
    // Log each user message for debugging
    userMessages.forEach((msg, index) => {
      this.logger.log(`   👤 User message ${index + 1}: "${msg.text}" (audio: ${msg.audioBase64 ? msg.audioBase64.length + ' chars' : 'none'})`);
    });
    
    this.logger.log(`   📝 Full conversation transcript:\n${conversationText}`);

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

ENHANCED ANALYSIS REQUIREMENTS:

1. PRONUNCIATION: Identify specific mispronounced words and provide IPA notation for correct pronunciation
2. FLUENCY: Analyze speech patterns, filler word usage (um, uh, like, you know, etc.), and natural flow
3. VOCABULARY: Suggest advanced alternatives for basic words used, considering CEFR level appropriateness
4. GRAMMAR: Provide specific examples and corrections for errors found

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
          "notes": "Difficulty with vowel sounds - focus on /æ/ sound"
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
          "notes": "Past tense confusion - use 'went' for past actions"
        }
      ]
    },
    "vocabulary": {
      "score": 0-100,
      "rareWordsUsed": ["sophisticated", "elaborate"],
      "repeatedWords": ["very", "good", "nice"],
      "suggestedWords": ["excellent instead of good", "remarkable instead of very good", "outstanding instead of nice"]
    },
    "fluency": {
      "score": 0-100,
      "wordsPerMinute": ${wordsPerMinute},
      "nativeRange": {"min": 120, "max": 180},
      "pausesPerMinute": 5,
      "fillerWordsCount": 0,
      "fillerWordsRatio": 0.0,
      "mostUsedWords": [{"word": "like", "count": 8}, {"word": "um", "count": 5}]
    }
  },
  "notes": "Detailed assessment notes explaining the level determination"
}

CEFR Level Guidelines:
- A1: Basic phrases, present tense, simple vocabulary, 60-90 WPM, high filler word usage (>15%)
- A2: Simple past/future, basic conversations, 80-110 WPM, moderate filler words (10-15%)
- B1: Complex sentences, opinions, 100-130 WPM, occasional filler words (5-10%)
- B2: Abstract topics, nuanced expression, 120-150 WPM, minimal filler words (2-5%)
- C1: Sophisticated language, subtle meanings, 140-170 WPM, rare filler words (<2%)
- C2: Native-like fluency and complexity, 160-200 WPM, natural speech patterns (<1%)

ANALYSIS FOCUS:
- Grammar accuracy and complexity
- Vocabulary range and sophistication
- Sentence structure and complexity
- Fluency and natural speech patterns (including filler word analysis)
- Pronunciation clarity and accuracy
- Word repetition and variety

VOCABULARY vs FLUENCY ANALYSIS:
- vocabulary.repeatedWords: Basic words used repeatedly that could be replaced with more advanced alternatives
- vocabulary.suggestedWords: Advanced alternatives for the basic words (format: "advanced word instead of basic word")
- fluency.mostUsedWords: All frequently used words including filler words that affect speech naturalness
- fluency.fillerWordsCount: Total count of filler words (um, uh, like, etc.)
- fluency.fillerWordsRatio: Percentage of filler words vs total words

For vocabulary suggestions, provide words that are:
- One level above the user's current usage
- Contextually appropriate
- Commonly used by native speakers
- Suitable for the conversation topic
- Format as "advanced_word instead of basic_word"

For pronunciation, focus on:
- Common phonetic challenges for ${languageName} learners
- Specific IPA notation for mispronounced sounds
- Practical improvement suggestions

Count and analyze filler words like: ${language === 'english' ? 'um, uh, like, you know, actually, basically, literally' : 'eh, este, pues, o sea, bueno, entonces, como que'}`;
  }

  private mapToFeedbackStructure(feedbackData: any, wordsPerMinute: number): PracticeFeedbackAggregate {
    return {
      pronunciation: {
        score: feedbackData?.pronunciation?.score || 50,
        mispronouncedWords: (feedbackData?.pronunciation?.mispronouncedWords || []).map((word: any) => ({
          word: word.word || '',
          attempts: word.attempts || 1,
          lastHeard: new Date(word.lastHeard || Date.now()),
          ipa: word.ipa || '',
          notes: word.notes || '',
        })),
      },
      grammar: {
        score: feedbackData?.grammar?.score || 50,
        errors: (feedbackData?.grammar?.errors || []).map((error: any) => ({
          type: error.type || 'unknown',
          example: error.example || '',
          correction: error.correction || '',
          notes: error.notes || '',
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
        fillerWordsCount: feedbackData?.fluency?.fillerWordsCount || 0,
        fillerWordsRatio: feedbackData?.fluency?.fillerWordsRatio || 0,
        mostUsedWords: feedbackData?.fluency?.mostUsedWords || [],
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
        fillerWordsCount: 0,
        fillerWordsRatio: 0,
        mostUsedWords: [],
      },
    };
  }
}