import { IsIn, IsOptional, IsString } from 'class-validator';
import { GrammarCheckLanguage } from '../openai.service';

export class GrammarCheckDto {
  @IsString()
  text: string;

  @IsIn(['english', 'spanish'])
  language: GrammarCheckLanguage;

  @IsOptional()
  @IsString()
  dialectHint?: string;
}

