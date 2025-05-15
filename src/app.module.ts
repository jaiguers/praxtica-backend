import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { ChallengesModule } from './challenges/challenges.module';
import { OpenAIModule } from './openai/openai.module';
import { PingModule } from './ping/ping.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    AuthModule,
    ChallengesModule,
    OpenAIModule,
    PingModule,
  ],
})
export class AppModule {} 