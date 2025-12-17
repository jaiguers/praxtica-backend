import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  LANGUAGES,
  CEFR_LEVELS,
  Language,
  CefrLevel,
} from '../../schemas/user.schema';

export class StartPracticeSessionDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsEnum(LANGUAGES)
  language: Language;

  @IsEnum(CEFR_LEVELS)
  level: CefrLevel;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsString({ each: true })
  topics?: string[];

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsString()
  aiPersona?: string;

  @IsOptional()
  @IsBoolean()
  captureAudio?: boolean;
}

