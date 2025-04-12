import { Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';

export interface TestResult {
  passed: boolean;
  description: string;
  details?: string;
}

interface VerificationResult {
  success: boolean;
  testResults: TestResult[];
}

@Injectable()
export class GitHubService {
  private readonly octokit: Octokit;
  private readonly workspaceDir: string;

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
    this.workspaceDir = path.join(process.cwd(), 'workspace');
  }

  async createRepository(challengeId: string, username: string): Promise<string> {
    const repoName = `${challengeId}-challenge`;
    
    try {
      // Crear el repositorio en GitHub
      const { data } = await this.octokit.repos.createForAuthenticatedUser({
        name: repoName,
        private: true,
        auto_init: true
      });

      // Clonar el repositorio localmente
      const repoPath = path.join(this.workspaceDir, username, repoName);
      if (!fs.existsSync(repoPath)) {
        fs.mkdirSync(repoPath, { recursive: true });
      }

      const git: SimpleGit = simpleGit();
      await git.clone(data.clone_url, repoPath);

      // Configurar el repositorio con los archivos iniciales del desafío
      await this.setupInitialChallenge(challengeId, repoPath);

      return data.html_url;
    } catch (error) {
      console.error('Error creating repository:', error);
      throw new Error('Error al crear el repositorio');
    }
  }

  async verifyRepositoryChanges(
    challengeId: string,
    stepId: number,
    username: string
  ): Promise<VerificationResult> {
    const repoName = `${challengeId}-challenge`;
    const repoPath = path.join(this.workspaceDir, username, repoName);

    try {
      const git: SimpleGit = simpleGit(repoPath);
      await git.fetch('origin');
      const status = await git.status();

      // Verificar si hay cambios sin commitear
      if (status.modified.length > 0 || status.not_added.length > 0) {
        return {
          success: false,
          testResults: [{
            passed: false,
            description: 'Hay cambios sin commitear',
            details: 'Asegúrate de hacer commit y push de todos tus cambios.'
          }]
        };
      }

      // Ejecutar las pruebas específicas del paso
      const testResults = await this.runStepTests(challengeId, stepId, repoPath);
      const allTestsPassed = testResults.every(test => test.passed);

      return {
        success: allTestsPassed,
        testResults
      };
    } catch (error) {
      console.error('Error verifying changes:', error);
      throw new Error('Error al verificar los cambios');
    }
  }

  private async setupInitialChallenge(challengeId: string, repoPath: string): Promise<void> {
    // Aquí implementarías la lógica para configurar los archivos iniciales del desafío
    // Por ejemplo, copiar templates, crear estructura de archivos, etc.
    const templatePath = path.join(process.cwd(), 'templates', challengeId);
    
    if (fs.existsSync(templatePath)) {
      // Copiar archivos del template al repositorio
      fs.cpSync(templatePath, repoPath, { recursive: true });
      
      const git: SimpleGit = simpleGit(repoPath);
      await git.add('.');
      await git.commit('Initial challenge setup');
      await git.push('origin', 'main');
    }
  }

  private async runStepTests(challengeId: string, stepId: number, repoPath: string): Promise<TestResult[]> {
    // Aquí implementarías las pruebas específicas para cada paso del desafío
    // Por ejemplo, verificar la existencia de archivos, su contenido, etc.
    const testResults: TestResult[] = [];

    try {
      switch (challengeId) {
        case 'git-clone':
          testResults.push(...await this.runGitTests(stepId, repoPath));
          break;
        // Agregar más casos para otros desafíos
        default:
          throw new Error('Desafío no soportado');
      }
    } catch (error) {
      console.error('Error running tests:', error);
      testResults.push({
        passed: false,
        description: 'Error al ejecutar las pruebas',
        details: error.message
      });
    }

    return testResults;
  }

  private async runGitTests(stepId: number, repoPath: string): Promise<TestResult[]> {
    const testResults: TestResult[] = [];
    const git: SimpleGit = simpleGit(repoPath);

    switch (stepId) {
      case 5: // Create a blob object
        try {
          // Verificar si existe un objeto blob
          const objects = await fs.promises.readdir(path.join(repoPath, '.git', 'objects'));
          const hasBlob = objects.some(dir => dir.length === 2 && dir !== 'info' && dir !== 'pack');
          
          testResults.push({
            passed: hasBlob,
            description: 'Crear un objeto blob',
            details: hasBlob 
              ? 'Se encontró un objeto blob en el repositorio' 
              : 'No se encontró ningún objeto blob'
          });
        } catch (error) {
          testResults.push({
            passed: false,
            description: 'Error al verificar el objeto blob',
            details: error.message
          });
        }
        break;
      
      // Agregar más casos para otros pasos
    }

    return testResults;
  }
} 