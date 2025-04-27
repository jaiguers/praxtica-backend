import { Controller, Get, Post, Body, Param, Query, UseGuards, Patch, Req, HttpException, HttpStatus } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { Challenge } from '../schemas/challenge.schema';
import { JwtAuthGuard } from '../auth/jwt.guard';

interface CheckUsageResponse {
  success: boolean;
  message: string;
}

@Controller('api/challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllChallenges(): Promise<Challenge[]> {
    return this.challengesService.getAllChallenges();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
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
    @Req() req: any,
  ): Promise<Challenge> {
    // Verificar límites de uso
    const canProceed = await this.challengesService.checkUsageLimits(req.user.sub, 'git');
    if (!canProceed) {
      throw new Error('Has alcanzado el límite de uso para tu plan gratuito. Considera actualizar a un plan premium.');
    }

    const challenge = await this.challengesService.updateStepStatus(challengeId, stepId, status);
    await this.challengesService.updateChallengeProgress(req.user.sub, challengeId, stepId);
    return challenge;
  }

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard)
  async verifyChallenge(
    @Param('id') challengeId: string,
    @Body('stepId') stepId: number,
    @Body('githubUsername') githubUsername: string,
    @Req() req: any,
  ) {
    return this.challengesService.verifyChallenge(challengeId, stepId, githubUsername, req.user.sub);
  }

  @Get(':id/initialize')
  @UseGuards(JwtAuthGuard)
  async initializeRepository(
    @Param('id') challengeId: string,
    @Query('githubUsername') githubUsername: string,
  ) {
    return this.challengesService.initializeRepository(challengeId, githubUsername);
  }

  @Post(':id/feedback')
  @UseGuards(JwtAuthGuard)
  async updateChallengeFeedback(
    @Param('id') challengeId: string,
    @Body('stepId') stepId: number,
    @Body('feedback') feedback: { type: string },
    @Body('type') type: string,
    @Req() req: any,
  ) {
    // Verificar límites de uso
    const canProceed = await this.challengesService.checkUsageLimits(req.user.sub, type);
    if (!canProceed) {
      return {
        success: false,
        message: 'Has alcanzado el límite de uso para tu plan gratuito. Considera actualizar a un plan premium.',
        testResults: []
      };
    }

    await this.challengesService.updateChallengeProgress(req.user.sub, challengeId, stepId, feedback);
    return { success: true };
  }

  @Post(':id/updateChallengeGit')
  @UseGuards(JwtAuthGuard)
  async updateChallengeGit(
    @Param('id') challengeId: string,
    @Body('stepId') stepId: number,
    @Req() req: any,
  ) {
    // Verificar límites de uso
    const canProceed = await this.challengesService.checkUsageLimits(req.user.sub, 'git');
    if (!canProceed) {
      return {
        success: false,
        message: 'Has alcanzado el límite de uso para tu plan gratuito. Considera actualizar a un plan premium.',
        testResults: []
      };
    }

    await this.challengesService.updateChallengeProgress(req.user.sub, challengeId, stepId);
    return { success: true };
  }

  @Get('check-usage/:type')
  @UseGuards(JwtAuthGuard)
  async checkUsageLimits(
    @Param('type') challengeType: string,
    @Req() req: any,
  ): Promise<CheckUsageResponse> {
    try {
      if (!req.user) {
        throw new HttpException(
          'Usuario no autenticado',
          HttpStatus.UNAUTHORIZED
        );
      }

      if (!['git', 'english', 'spanish'].includes(challengeType)) {
        throw new HttpException(
          'Tipo de desafío inválido. Debe ser "git" o "english" o "spanish"',
          HttpStatus.BAD_REQUEST
        );
      }

      const canProceed = await this.challengesService.checkUsageLimits(req.user.sub, challengeType);

      return {
        success: canProceed,
        message: canProceed ? 'Puedes continuar con el desafío' : 'Has alcanzado el límite de uso para tu plan gratuito',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Error al verificar los límites de uso',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 