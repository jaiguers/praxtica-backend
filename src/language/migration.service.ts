import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, Language } from '../schemas/user.schema';

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Migrate existing practice sessions to add missing title field
   */
  async migratePracticeSessionTitles(): Promise<{ updated: number; total: number }> {
    this.logger.log('Starting migration of practice session titles...');

    const users = await this.userModel.find({
      'practiceSessions.0': { $exists: true }
    }).exec();

    let totalUpdated = 0;
    let totalSessions = 0;

    for (const user of users) {
      let userUpdated = false;

      if (user.practiceSessions) {
        for (let i = 0; i < user.practiceSessions.length; i++) {
          const session = user.practiceSessions[i];
          totalSessions++;

          if (session.conversationLog && !session.conversationLog.title) {
            // Generate appropriate title based on session data
            const title = this.generateMigrationTitle(session.language, session, i + 1);
            session.conversationLog.title = title;
            userUpdated = true;
            totalUpdated++;
            
            this.logger.log(`Updated session ${i + 1} for user ${user._id}: "${title}"`);
          }
        }
      }

      if (userUpdated) {
        user.markModified('practiceSessions');
        await user.save();
      }
    }

    this.logger.log(`Migration completed: ${totalUpdated}/${totalSessions} sessions updated`);
    return { updated: totalUpdated, total: totalSessions };
  }

  private generateMigrationTitle(language: Language, session: any, sessionNumber: number): string {
    // Check if it's a test based on session data
    const isTest = session.conversationLog?.transcript?.some((msg: any) => 
      msg.text?.toLowerCase().includes('placement test') ||
      msg.text?.toLowerCase().includes('examen de nivelación') ||
      msg.text?.toLowerCase().includes('assessment') ||
      msg.text?.toLowerCase().includes('evaluación')
    );

    if (isTest) {
      return language === 'english' ? 'Placement Test' : 'Examen de Nivelación';
    }

    // For practice sessions, use numbered format
    return language === 'english' 
      ? `Practice #${sessionNumber}` 
      : `Práctica #${sessionNumber}`;
  }
}