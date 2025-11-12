import { Module } from '@nestjs/common';
import { OpenAIController } from './openai.controller';
import { OpenAIService } from './openai.service';
import { OpenAIRealtimeService } from './openai-realtime.service';

@Module({
  controllers: [OpenAIController],
  providers: [OpenAIService, OpenAIRealtimeService],
  exports: [OpenAIService, OpenAIRealtimeService],
})
export class OpenAIModule {}