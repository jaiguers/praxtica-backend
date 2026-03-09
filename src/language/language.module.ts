import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OpenAIModule } from '../openai/openai.module';
import { LiveKitModule } from '../livekit/livekit.module';
import { User, UserSchema } from '../auth/user.model';
import { LanguageController } from './language.controller';
// Removed WebSocket gateways
import { LanguageService } from './language.service';
import { LanguageAnalyticsService } from './language-analytics.service';
import { RedisStorageService } from './redis-storage.service';
import { CefrAnalysisService } from './cefr-analysis.service';
import { WhisperTranscriptionService } from './whisper-transcription.service';
import { MigrationService } from './migration.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    OpenAIModule,
    LiveKitModule,
  ],
  controllers: [LanguageController],
  providers: [
    LanguageService,
    LanguageAnalyticsService,
    RedisStorageService,
    CefrAnalysisService,
    WhisperTranscriptionService,
    MigrationService,
  ],
  exports: [LanguageService],
})
export class LanguageModule { }

