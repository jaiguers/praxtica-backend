import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('api/openai')
export class OpenAIController {
  constructor(private readonly openAIService: OpenAIService) {}

  @Post('check-grammar')
  async checkGrammar(@Body('text') text: string) {
    return this.openAIService.checkGrammar(text);
  }

  @Post('check-spanish-grammar')
  async checkSpanishGrammar(@Body('text') text: string) {
    return this.openAIService.checkSpanishGrammar(text);
  }

  @Get('conversation')
  async generateConversation(
    @Query('context') context: string,
    @Query('difficulty') difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ) {
    return this.openAIService.generateConversation(context, difficulty);
  }

  @Post('spanish-conversation')
  @UseGuards(JwtAuthGuard)
  async generateSpanishConversation(
    @Query('context') context: string,
    @Query('difficulty') difficulty: 'principiante' | 'intermedio' | 'avanzado' = 'intermedio',
    @Body('conversationHistory') conversationHistory: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = []
  ) {
    return this.openAIService.generateSpanishConversation(context, conversationHistory, difficulty);
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