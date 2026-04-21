"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveKitModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const livekit_service_1 = require("./livekit.service");
const livekit_agent_service_1 = require("./livekit-agent.service");
const livekit_controller_1 = require("./livekit.controller");
const openai_module_1 = require("../openai/openai.module");
let LiveKitModule = class LiveKitModule {
};
exports.LiveKitModule = LiveKitModule;
exports.LiveKitModule = LiveKitModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, openai_module_1.OpenAIModule],
        controllers: [livekit_controller_1.LiveKitController],
        providers: [livekit_service_1.LiveKitService, livekit_agent_service_1.LiveKitAgentService],
        exports: [livekit_service_1.LiveKitService, livekit_agent_service_1.LiveKitAgentService],
    })
], LiveKitModule);
//# sourceMappingURL=livekit.module.js.map