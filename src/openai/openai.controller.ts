import { Body, Controller, Post } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { GrammarCheckDto } from './dto/grammar-check.dto';
import { GenerateToeflTestDto } from './dto/generate-toefl-test.dto';

@Controller('api/openai')
export class OpenAIController {
  constructor(private readonly openAIService: OpenAIService) {}

  @Post('grammar-check')
  async grammarCheck(@Body() body: GrammarCheckDto) {
    return this.openAIService.checkGrammar(body);
  }

  @Post('toefl-test')
  async generateToeflTest(@Body() body: GenerateToeflTestDto) {
    return this.openAIService.generateToeflTest(body);
  }
}
