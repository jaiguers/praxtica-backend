import { OpenAIService } from './openai.service';
import { GrammarCheckDto } from './dto/grammar-check.dto';
import { GenerateCefrPlacementTestDto } from './dto/generate-cefr-placement-test.dto';
export declare class OpenAIController {
    private readonly openAIService;
    constructor(openAIService: OpenAIService);
    grammarCheck(body: GrammarCheckDto): Promise<import("./interfaces/grammar-check.interface").GrammarCheckResponse>;
    generateCefrPlacementTest(body: GenerateCefrPlacementTestDto): Promise<import("./openai.service").CefrPlacementTest>;
}
