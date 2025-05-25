import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Challenge, ChallengeDocument, ChallengeStep, Task } from '../schemas/challenge.schema';
import { GitHubService } from './github.service';
import { TestResult } from './github.service';
import { UserService } from '../auth/services/user.service';

@Injectable()
export class ChallengesService {
  constructor(
    @InjectModel(Challenge.name) private challengeModel: Model<ChallengeDocument>,
    private readonly githubService: GitHubService,
    private readonly userService: UserService,
  ) { }

  async getAllChallenges(): Promise<ChallengeDocument[]> {
    return this.challengeModel.find({ active: true }).exec();
  }

  async getChallengeById(id: string): Promise<ChallengeDocument> {
    return this.challengeModel.findById(id).exec();
  }

  async createChallenge(challengeData: Partial<Challenge>): Promise<ChallengeDocument> {
    // Asegurarse de que el tipo esté definido
    if (!challengeData.type) {
      challengeData.type = 'git'; // Tipo por defecto
    }

    // Si el tipo es "english" o "spanish", no debe tener pasos
    if (challengeData.type === 'english' || challengeData.type === 'spanish') {
      challengeData.steps = [];
    } else {
      // Para desafíos de tipo "git", asegurarse de que los pasos "Introduccion" y "Configurar Repo" estén presentes
      const steps = challengeData.steps || [];

      // Verificar si ya existe un paso de introducción
      const hasIntro = steps.some(step => step.title === 'Introduccion');
      if (!hasIntro) {
        steps.unshift({
          title: 'Introduccion',
          description: 'Introducción al desafío',
          status: 'pending',
          isActive: true,
          tabs: {
            instructions: {
              text: 'Instrucciones de introducción',
              task: {
                title: 'Leer la introducción',
                description: 'Lee cuidadosamente la introducción al desafío',
                status: 'pending'
              }
            }
          }
        });
      }

      // Verificar si ya existe un paso de configuración de repositorio
      const hasRepoSetup = steps.some(step => step.title === 'Configurar Repo');
      if (!hasRepoSetup) {
        // Insertar después de la introducción
        const introIndex = steps.findIndex(step => step.title === 'Introduccion');
        steps.splice(introIndex + 1, 0, {
          title: 'Configurar Repo',
          description: 'Configuración del repositorio',
          status: 'pending',
          isActive: false,
          tabs: {
            instructions: {
              text: 'Instrucciones para configurar el repositorio',
              task: {
                title: 'Configurar el repositorio',
                description: 'Configura el repositorio según las instrucciones',
                status: 'pending'
              }
            }
          }
        });
      }

      challengeData.steps = steps;
    }

    const newChallenge = new this.challengeModel(challengeData);
    return newChallenge.save();
  }

  async updateStepStatus(challengeId: string, stepId: number, status: string): Promise<ChallengeDocument> {
    const challenge = await this.challengeModel.findById(challengeId);
    if (!challenge) {
      throw new Error('Desafío no encontrado');
    }

    // Verificar que el desafío sea de tipo "git"
    if (challenge.type !== 'git') {
      throw new Error('Los desafíos de tipo "idiomas" no tienen pasos');
    }

    if (stepId < 0 || stepId >= challenge.steps.length) {
      throw new Error('Paso no encontrado');
    }

    // Actualizar el estado del paso
    challenge.steps[stepId].status = status;

    // Actualizar el estado de la tarea si existe
    if (challenge.steps[stepId].tabs?.instructions?.task) {
      challenge.steps[stepId].tabs.instructions.task.status = status;
    }

    return challenge.save();
  }

  async checkUsageLimits(userId: string, challengeType: string): Promise<boolean> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar si la suscripción está activa
    if (user.subscription.plan !== 'free') {
      const currentDate = new Date();
      return user.subscription.endDate > currentDate; // Permitir continuar si la fecha de finalización es posterior a la fecha actual
    }

    if (challengeType === 'english' || challengeType === 'spanish') {
      const progress = user.challengeProgress.find(p => p.language === challengeType);
      if (!progress) {
        return true; // Primer uso
      }
      return progress.completedSteps.length < 5;
    } else if (challengeType === 'git') {
      const progress = user.challengeProgress.find(p => p.language === 'git');
      if (!progress) {
        return true; // Primer uso
      }
      return progress.currentStep < 4;
    }

    return true;
  }

  async updateChallengeProgress(userId: string, challengeId: string, stepId: number, feedback?: { type: string }): Promise<void> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const challenge = await this.challengeModel.findById(challengeId);
    if (!challenge) {
      throw new Error('Desafío no encontrado');
    }

    const existingProgressIndex = user.challengeProgress.findIndex(p => p.challengeId === challengeId);

    if (existingProgressIndex !== -1) {
      const existingProgress = user.challengeProgress[existingProgressIndex];

      if (!existingProgress.completedSteps.includes(stepId)) {
        // Actualizar el progreso existente
        existingProgress.completedSteps.push(stepId);
        existingProgress.currentStep = stepId;
        existingProgress.lastUpdated = new Date();

        // Actualizar el array challengeProgress del usuario
        user.challengeProgress[existingProgressIndex] = existingProgress;

        // Incrementar ranking según el tipo de desafío
        if (challenge.type === 'git' && challenge.steps[stepId].status === 'completed') {
          await this.userService.incrementRanking(userId);
        } else if ((challenge.type === 'english' || challenge.type === 'spanish') && feedback?.type === 'perfect') {
          await this.userService.incrementRanking(userId);
        }
      }
    } else {
      // Crear nuevo progreso
      user.challengeProgress.push({
        challengeId,
        language: challenge.type,
        currentStep: stepId,
        completedSteps: [stepId],
        startedAt: new Date(),
        lastUpdated: new Date()
      });

      // Incrementar ranking según el tipo de desafío
      if (challenge.type === 'git' && challenge.steps[stepId].status === 'completed') {
        await this.userService.incrementRanking(userId);
      } else if ((challenge.type === 'english' || challenge.type === 'spanish') && feedback?.type === 'perfect') {
        await this.userService.incrementRanking(userId);
      }
    }

    // Guardar los cambios en la base de datos
    await user.save();
  }

  async verifyChallenge(challengeId: string, stepId: number, githubUsername: string, userId: string): Promise<{ success: boolean; message: string; testResults: TestResult[] }> {
    try {
      const challenge = await this.challengeModel.findById(challengeId);
      if (!challenge) {
        throw new Error('Desafío no encontrado');
      }

      // Verificar límites de uso
      const canProceed = await this.checkUsageLimits(userId, challenge.type);
      if (!canProceed) {
        return {
          success: false,
          message: 'Has alcanzado el límite de uso para tu plan gratuito. Considera actualizar a un plan premium.',
          testResults: []
        };
      }

      // Verificar que el desafío sea de tipo "git"
      if (challenge.type !== 'git') {
        throw new Error('Los desafíos de tipo "idiomas" no tienen pasos para verificar');
      }

      const verificationResult = await this.githubService.verifyRepositoryChanges(
        challengeId,
        stepId,
        githubUsername
      );

      // Actualizar el estado del paso y la tarea si la verificación es exitosa
      if (verificationResult.success) {
        await this.updateStepStatus(challengeId, stepId, 'completed');
        await this.updateChallengeProgress(userId, challengeId, stepId);
      }

      return {
        success: verificationResult.success,
        message: verificationResult.success ? '¡Excelente trabajo!' : 'Hay algunos problemas que corregir',
        testResults: verificationResult.testResults
      };
    } catch (error) {
      console.error('Error verifying challenge:', error);
      return {
        success: false,
        message: 'Error al verificar el desafío',
        testResults: []
      };
    }
  }

  async initializeRepository(challengeId: string, githubUsername: string) {
    try {
      const challenge = await this.challengeModel.findById(challengeId);
      if (!challenge) {
        throw new Error('Desafío no encontrado');
      }

      // Verificar que el desafío sea de tipo "git"
      if (challenge.type !== 'git') {
        throw new Error('Los desafíos de tipo "idiomas" no requieren inicialización de repositorio');
      }

      const repoUrl = await this.githubService.createRepository(challengeId, githubUsername);
      return {
        success: true,
        repoUrl
      };
    } catch (error) {
      console.error('Error initializing repository:', error);
      return {
        success: false,
        message: 'Error al inicializar el repositorio'
      };
    }
  }
} 