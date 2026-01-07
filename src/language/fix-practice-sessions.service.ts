import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class FixPracticeSessionsService {
  private readonly logger = new Logger(FixPracticeSessionsService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Fix practice sessions with invalid startedAt dates (1970 issue)
   */
  async fixInvalidStartedAtDates(): Promise<{ fixed: number; total: number }> {
    this.logger.log('🔧 Starting fix for invalid startedAt dates...');
    
    let fixed = 0;
    let total = 0;

    // Find all users with practice sessions
    const users = await this.userModel.find({
      'practiceSessions.0': { $exists: true }
    }).exec();

    for (const user of users) {
      let userModified = false;

      for (const session of user.practiceSessions || []) {
        total++;
        
        // Check if startedAt is in 1970 (Unix epoch issue)
        const startedAt = new Date(session.startedAt);
        const year = startedAt.getFullYear();
        
        if (year === 1970) {
          this.logger.log(`🐛 Found invalid startedAt for user ${user._id}, session ${session._id}: ${startedAt.toISOString()}`);
          
          // Calculate a reasonable startedAt based on endedAt and duration
          const endedAt = session.endedAt ? new Date(session.endedAt) : new Date();
          const durationMs = (session.durationSeconds || 300) * 1000; // Default 5 minutes if no duration
          const newStartedAt = new Date(endedAt.getTime() - durationMs);
          
          // Ensure the new date is reasonable (not in the future, not too far in the past)
          const now = new Date();
          const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          
          if (newStartedAt > now) {
            // If calculated date is in the future, use endedAt - 5 minutes
            session.startedAt = new Date(endedAt.getTime() - 300000);
          } else if (newStartedAt < oneYearAgo) {
            // If calculated date is too far in the past, use a reasonable default
            session.startedAt = new Date(endedAt.getTime() - 300000);
          } else {
            session.startedAt = newStartedAt;
          }
          
          this.logger.log(`✅ Fixed startedAt: ${session.startedAt.toISOString()}`);
          fixed++;
          userModified = true;
        }
      }

      if (userModified) {
        user.markModified('practiceSessions');
        await user.save();
        this.logger.log(`💾 Saved fixes for user ${user._id}`);
      }
    }

    this.logger.log(`🎉 Fix completed: ${fixed}/${total} sessions fixed`);
    return { fixed, total };
  }

  /**
   * Validate and report practice sessions data integrity
   */
  async validatePracticeSessionsIntegrity(): Promise<{
    totalSessions: number;
    invalidDates: number;
    missingLevels: number;
    inconsistentLevels: number;
  }> {
    this.logger.log('🔍 Validating practice sessions data integrity...');
    
    let totalSessions = 0;
    let invalidDates = 0;
    let missingLevels = 0;
    let inconsistentLevels = 0;

    const users = await this.userModel.find({
      'practiceSessions.0': { $exists: true }
    }).exec();

    for (const user of users) {
      for (const session of user.practiceSessions || []) {
        totalSessions++;
        
        // Check for invalid dates
        const startedAt = new Date(session.startedAt);
        if (isNaN(startedAt.getTime()) || startedAt.getFullYear() === 1970) {
          invalidDates++;
          this.logger.warn(`❌ Invalid startedAt in session ${session._id}: ${session.startedAt}`);
        }
        
        // Check for missing levels
        if (!session.level) {
          missingLevels++;
          this.logger.warn(`❌ Missing level in session ${session._id}`);
        }
        
        // Check for inconsistent levels (if user has current level set)
        const userCurrentLevel = user.currentLevels?.get(session.language);
        if (userCurrentLevel && session.completed && session.level !== userCurrentLevel.level) {
          // Only flag as inconsistent if the session is recent (within last 30 days)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          if (startedAt > thirtyDaysAgo) {
            inconsistentLevels++;
            this.logger.warn(`⚠️ Level inconsistency in session ${session._id}: session=${session.level}, user=${userCurrentLevel.level}`);
          }
        }
      }
    }

    const report = {
      totalSessions,
      invalidDates,
      missingLevels,
      inconsistentLevels,
    };

    this.logger.log('📊 Integrity report:', report);
    return report;
  }
}