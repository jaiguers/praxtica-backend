"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChallengesModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const challenges_controller_1 = require("./challenges.controller");
const challenges_service_1 = require("./challenges.service");
const github_service_1 = require("./github.service");
const challenge_schema_1 = require("../schemas/challenge.schema");
const user_service_1 = require("../auth/services/user.service");
const auth_module_1 = require("../auth/auth.module");
let ChallengesModule = class ChallengesModule {
};
exports.ChallengesModule = ChallengesModule;
exports.ChallengesModule = ChallengesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: challenge_schema_1.Challenge.name, schema: challenge_schema_1.ChallengeSchema }]),
            auth_module_1.AuthModule,
        ],
        controllers: [challenges_controller_1.ChallengesController],
        providers: [challenges_service_1.ChallengesService, github_service_1.GitHubService, user_service_1.UserService],
        exports: [challenges_service_1.ChallengesService],
    })
], ChallengesModule);
//# sourceMappingURL=challenges.module.js.map