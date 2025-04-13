import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { GitHubService } from './github.service';
import { Challenge, ChallengeSchema } from '../schemas/challenge.schema';
import { UserService } from '../auth/services/user.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Challenge.name, schema: ChallengeSchema }]),
    AuthModule,
  ],
  controllers: [ChallengesController],
  providers: [ChallengesService, GitHubService, UserService],
  exports: [ChallengesService],
})
export class ChallengesModule {} 