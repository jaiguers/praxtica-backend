import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { OpenAIService } from './openai.service';

@Controller('api/openai')
export class OpenAIController {
  constructor(private readonly openAIService: OpenAIService) {}

  @Post('check-grammar')
  async checkGrammar(@Body('text') text: string) {
    return this.openAIService.checkGrammar(text);
  }

  @Get('conversation')
  async generateConversation(
    @Query('context') context: string,
    @Query('difficulty') difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ) {
    return this.openAIService.generateConversation(context, difficulty);
  }

  @Get('practice-speaking')
  async practiceSpeaking(
    @Query('topic') topic: string,
    @Query('level') level: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ) {
    return this.openAIService.practiceSpeaking(topic, level);
  }

  @Post('translate')
  async translateToEnglish(
    @Body('text') text: string,
    @Body('fromLanguage') fromLanguage: string
  ) {
    return this.openAIService.translateToEnglish(text, fromLanguage);
  }
} 