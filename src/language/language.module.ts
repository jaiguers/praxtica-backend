import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OpenAIModule } from '../openai/openai.module';
import { User, UserSchema } from '../auth/user.model';
import { LanguageController } from './language.controller';
import { LanguageGateway } from './language.gateway';
import { LanguageService } from './language.service';
import { LanguageAnalyticsService } from './language-analytics.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    OpenAIModule,
  ],
  controllers: [LanguageController],
  providers: [LanguageService, LanguageGateway, LanguageAnalyticsService],
  exports: [LanguageService],
})
export class LanguageModule {}

