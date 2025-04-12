import { Controller, Get, Post, Body, Param, Query, UseGuards, Patch } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { Challenge } from '../schemas/challenge.schema';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('api/challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllChallenges(): Promise<Challenge[]> {
    return this.challengesService.getAllChallenges();
  }

  @Get(':id')
  async getChallengeById(@Param('id') id: string): Promise<Challenge> {
    return this.challengesService.getChallengeById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createChallenge(@Body() challengeData: Partial<Challenge>): Promise<Challenge> {
    return this.challengesService.createChallenge(challengeData);
  }

  @Patch(':id/steps/:stepId/status')
  @UseGuards(JwtAuthGuard)
  async updateStepStatus(
    @Param('id') challengeId: string,
    @Param('stepId') stepId: number,
    @Body('status') status: string,
  ): Promise<Challenge> {
    return this.challengesService.updateStepStatus(challengeId, stepId, status);
  }

  @Get(':id/verify')
  @UseGuards(JwtAuthGuard)
  async verifyChallenge(
    @Param('id') challengeId: string,
    @Query('stepId') stepId: number,
    @Query('githubUsername') githubUsername: string,
  ) {
    return this.challengesService.verifyChallenge(challengeId, stepId, githubUsername);
  }

  @Get(':id/initialize')
  @UseGuards(JwtAuthGuard)
  async initializeRepository(
    @Param('id') challengeId: string,
    @Query('githubUsername') githubUsername: string,
  ) {
    return this.challengesService.initializeRepository(challengeId, githubUsername);
  }
} 