"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const auth_module_1 = require("./auth/auth.module");
const challenges_module_1 = require("./challenges/challenges.module");
const openai_module_1 = require("./openai/openai.module");
const ping_module_1 = require("./ping/ping.module");
const plans_module_1 = require("./plans/plans.module");
const payments_module_1 = require("./payments/payments.module");
const language_module_1 = require("./language/language.module");
const livekit_module_1 = require("./livekit/livekit.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            mongoose_1.MongooseModule.forRoot(process.env.MONGODB_URI),
            auth_module_1.AuthModule,
            challenges_module_1.ChallengesModule,
            openai_module_1.OpenAIModule,
            ping_module_1.PingModule,
            plans_module_1.PlansModule,
            payments_module_1.PaymentsModule,
            language_module_1.LanguageModule,
            livekit_module_1.LiveKitModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map