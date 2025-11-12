import {
  IsEnum,
  IsDateString,
  ValidateNested,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsString,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  LANGUAGES,
  CEFR_LEVELS,
  Language,
  CefrLevel,
} from '../../schemas/user.schema';

const LANGUAGE_TEST_ATTACHMENT_KINDS = [
  'audio',
  'transcript',
  'screenshot',
] as const;
type LanguageTestAttachmentKind =
  (typeof LANGUAGE_TEST_ATTACHMENT_KINDS)[number];

class LanguageTestBreakdownDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  grammar: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  pronunciation: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  vocabulary: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  fluency: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  listening?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  reading?: number;
}

class LanguageTestAttachmentDto {
  @IsString()
  url: string;

  @IsEnum(LANGUAGE_TEST_ATTACHMENT_KINDS)
  kind: LanguageTestAttachmentKind;
}

class LanguageTestMetadataDto {
  @IsOptional()
  @IsString()
  promptSeed?: string;

  @IsOptional()
  @IsString()
  aiModel?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => LanguageTestAttachmentDto)
  attachments?: LanguageTestAttachmentDto[];
}

export class CreateLanguageTestDto {
  @IsEnum(LANGUAGES)
  language: Language;

  @IsDateString()
  date: string;

  @IsEnum(CEFR_LEVELS)
  level: CefrLevel;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(120)
  score?: number;

  @ValidateNested()
  @Type(() => LanguageTestBreakdownDto)
  breakdown: LanguageTestBreakdownDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LanguageTestMetadataDto)
  metadata?: LanguageTestMetadataDto;

  @IsOptional()
  @IsBoolean()
  allowRetake?: boolean;
}

