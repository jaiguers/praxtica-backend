import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CEFR_LEVELS,
  CefrLevel,
  LANGUAGES,
  Language,
} from '../../schemas/user.schema';

const CONVERSATION_ROLES = ['user', 'assistant'] as const;
type ConversationRole = (typeof CONVERSATION_ROLES)[number];

class MispronouncedWordDto {
  @IsString()
  word: string;

  @IsNumber()
  @Min(1)
  attempts: number;

  @IsDateString()
  lastHeard: string;

  @IsOptional()
  @IsString()
  ipa?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class PronunciationFeedbackDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => MispronouncedWordDto)
  mispronouncedWords: MispronouncedWordDto[];
}

class GrammarErrorDto {
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  example?: string;

  @IsOptional()
  @IsString()
  correction?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class GrammarFeedbackDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => GrammarErrorDto)
  errors: GrammarErrorDto[];
}

class VocabularyFeedbackDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  rareWordsUsed: string[];

  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  repeatedWords: string[];

  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  suggestedWords: string[];
}

class NativeRangeDto {
  @IsNumber()
  @Min(0)
  min: number;

  @IsNumber()
  @Min(0)
  max: number;
}

class WordFrequencyDto {
  @IsString()
  word: string;

  @IsNumber()
  @Min(1)
  count: number;
}

class FluencyFeedbackDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @IsNumber()
  @Min(0)
  wordsPerMinute: number;

  @ValidateNested()
  @Type(() => NativeRangeDto)
  nativeRange: NativeRangeDto;

  @IsNumber()
  @Min(0)
  pausesPerMinute: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fillerWordsCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  fillerWordsRatio?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => WordFrequencyDto)
  mostUsedWords?: WordFrequencyDto[];
}

class ConversationTranscriptItemDto {
  @IsEnum(CONVERSATION_ROLES)
  role: ConversationRole;

  @IsString()
  text: string;

  @IsNumber()
  @Min(0)
  timestamp: number;
}

class ConversationAudioItemDto {
  @IsEnum(CONVERSATION_ROLES)
  role: ConversationRole;

  @IsString()
  url: string;
}

class ConversationLogDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ConversationTranscriptItemDto)
  transcript?: ConversationTranscriptItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ConversationAudioItemDto)
  audioUrls?: ConversationAudioItemDto[];
}

class PracticeFeedbackDto {
  @ValidateNested()
  @Type(() => PronunciationFeedbackDto)
  pronunciation: PronunciationFeedbackDto;

  @ValidateNested()
  @Type(() => GrammarFeedbackDto)
  grammar: GrammarFeedbackDto;

  @ValidateNested()
  @Type(() => VocabularyFeedbackDto)
  vocabulary: VocabularyFeedbackDto;

  @ValidateNested()
  @Type(() => FluencyFeedbackDto)
  fluency: FluencyFeedbackDto;
}

export class CompletePracticeSessionDto {
  @IsEnum(LANGUAGES)
  language: Language;

  @IsOptional()
  @IsEnum(CEFR_LEVELS)
  level?: CefrLevel;

  @IsDateString()
  endedAt: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PracticeFeedbackDto)
  feedback?: PracticeFeedbackDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConversationLogDto)
  conversationLog?: ConversationLogDto;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  wordsCount?: number;
}

