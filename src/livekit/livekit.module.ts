import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LiveKitService } from './livekit.service';
import { LiveKitAgentService } from './livekit-agent.service';
import { LiveKitController } from './livekit.controller';
import { OpenAIModule } from '../openai/openai.module';

@Module({
    imports: [ConfigModule, OpenAIModule],
    controllers: [LiveKitController],
    providers: [LiveKitService, LiveKitAgentService],
    exports: [LiveKitService, LiveKitAgentService],
})
export class LiveKitModule { }
