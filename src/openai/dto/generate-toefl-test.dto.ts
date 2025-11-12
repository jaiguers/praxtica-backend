import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import { CEFR_LEVELS, CefrLevel } from '../../schemas/user.schema';
import { GenerateToeflTestOptions, ToeflSectionType } from '../openai.service';

const TOEFL_SECTION_TYPES: ToeflSectionType[] = [
  'reading',
  'listening',
  'speaking',
  'writing',
];

export class GenerateToeflTestDto implements GenerateToeflTestOptions {
  @IsOptional()
  @IsString()
  @IsIn(CEFR_LEVELS)
  level?: CefrLevel;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ArrayUnique()
  @IsString({ each: true })
  topics?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ArrayUnique()
  @IsIn(TOEFL_SECTION_TYPES, { each: true })
  focusSkills?: ToeflSectionType[];

  @IsOptional()
  @IsIn(['full', 'short'])
  variant?: 'full' | 'short';

  @IsOptional()
  @IsBoolean()
  includeRubric?: boolean;
}

