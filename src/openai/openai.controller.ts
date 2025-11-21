import { Body, Controller, Post } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { GrammarCheckDto } from './dto/grammar-check.dto';
import { GenerateCefrPlacementTestDto } from './dto/generate-cefr-placement-test.dto';

@Controller('api/openai')
export class OpenAIController {
  constructor(private readonly openAIService: OpenAIService) {}

  @Post('grammar-check')
  async grammarCheck(@Body() body: GrammarCheckDto) {
    return this.openAIService.checkGrammar(body);
  }

  @Post('cefr-placement-test')
  async generateCefrPlacementTest(
    @Body() body: GenerateCefrPlacementTestDto,
  ) {
    return this.openAIService.generateCefrPlacementTest(body);
  }
}
