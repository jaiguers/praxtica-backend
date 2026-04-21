"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const openai_module_1 = require("../openai/openai.module");
const livekit_module_1 = require("../livekit/livekit.module");
const user_model_1 = require("../auth/user.model");
const language_controller_1 = require("./language.controller");
const language_service_1 = require("./language.service");
const language_analytics_service_1 = require("./language-analytics.service");
const redis_storage_service_1 = require("./redis-storage.service");
const cefr_analysis_service_1 = require("./cefr-analysis.service");
const whisper_transcription_service_1 = require("./whisper-transcription.service");
const migration_service_1 = require("./migration.service");
let LanguageModule = class LanguageModule {
};
exports.LanguageModule = LanguageModule;
exports.LanguageModule = LanguageModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: user_model_1.User.name, schema: user_model_1.UserSchema }]),
            openai_module_1.OpenAIModule,
            livekit_module_1.LiveKitModule,
        ],
        controllers: [language_controller_1.LanguageController],
        providers: [
            language_service_1.LanguageService,
            language_analytics_service_1.LanguageAnalyticsService,
            redis_storage_service_1.RedisStorageService,
            cefr_analysis_service_1.CefrAnalysisService,
            whisper_transcription_service_1.WhisperTranscriptionService,
            migration_service_1.MigrationService,
        ],
        exports: [language_service_1.LanguageService],
    })
], LanguageModule);
//# sourceMappingURL=language.module.js.map