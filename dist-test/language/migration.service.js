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
var MigrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../schemas/user.schema");
let MigrationService = MigrationService_1 = class MigrationService {
    constructor(userModel) {
        this.userModel = userModel;
        this.logger = new common_1.Logger(MigrationService_1.name);
    }
    async migratePracticeSessionTitles() {
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
    generateMigrationTitle(language, session, sessionNumber) {
        const isTest = session.conversationLog?.transcript?.some((msg) => msg.text?.toLowerCase().includes('placement test') ||
            msg.text?.toLowerCase().includes('examen de nivelación') ||
            msg.text?.toLowerCase().includes('assessment') ||
            msg.text?.toLowerCase().includes('evaluación'));
        if (isTest) {
            return language === 'english' ? 'Placement Test' : 'Examen de Nivelación';
        }
        return language === 'english'
            ? `Practice #${sessionNumber}`
            : `Práctica #${sessionNumber}`;
    }
};
exports.MigrationService = MigrationService;
exports.MigrationService = MigrationService = MigrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], MigrationService);
//# sourceMappingURL=migration.service.js.map