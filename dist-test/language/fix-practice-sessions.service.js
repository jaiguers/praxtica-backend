"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var FixPracticeSessionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixPracticeSessionsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../schemas/user.schema");
let FixPracticeSessionsService = FixPracticeSessionsService_1 = class FixPracticeSessionsService {
    constructor(userModel) {
        this.userModel = userModel;
        this.logger = new common_1.Logger(FixPracticeSessionsService_1.name);
    }
    async fixInvalidStartedAtDates() {
        this.logger.log('🔧 Starting fix for invalid startedAt dates...');
        let fixed = 0;
        let total = 0;
        const users = await this.userModel.find({
            'practiceSessions.0': { $exists: true }
        }).exec();
        for (const user of users) {
            let userModified = false;
            for (const session of user.practiceSessions || []) {
                total++;
                const startedAt = new Date(session.startedAt);
                const year = startedAt.getFullYear();
                if (year === 1970) {
                    this.logger.log(`🐛 Found invalid startedAt for user ${user._id}, session ${session._id}: ${startedAt.toISOString()}`);
                    const endedAt = session.endedAt ? new Date(session.endedAt) : new Date();
                    const durationMs = (session.durationSeconds || 300) * 1000;
                    const newStartedAt = new Date(endedAt.getTime() - durationMs);
                    const now = new Date();
                    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                    if (newStartedAt > now) {
                        session.startedAt = new Date(endedAt.getTime() - 300000);
                    }
                    else if (newStartedAt < oneYearAgo) {
                        session.startedAt = new Date(endedAt.getTime() - 300000);
                    }
                    else {
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
    async validatePracticeSessionsIntegrity() {
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
                const startedAt = new Date(session.startedAt);
                if (isNaN(startedAt.getTime()) || startedAt.getFullYear() === 1970) {
                    invalidDates++;
                    this.logger.warn(`❌ Invalid startedAt in session ${session._id}: ${session.startedAt}`);
                }
                if (!session.level) {
                    missingLevels++;
                    this.logger.warn(`❌ Missing level in session ${session._id}`);
                }
                const userCurrentLevel = user.currentLevels?.get(session.language);
                if (userCurrentLevel && session.completed && session.level !== userCurrentLevel.level) {
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
};
exports.FixPracticeSessionsService = FixPracticeSessionsService;
exports.FixPracticeSessionsService = FixPracticeSessionsService = FixPracticeSessionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], FixPracticeSessionsService);
//# sourceMappingURL=fix-practice-sessions.service.js.map