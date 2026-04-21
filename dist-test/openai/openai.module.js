"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIModule = void 0;
const common_1 = require("@nestjs/common");
const openai_controller_1 = require("./openai.controller");
const openai_service_1 = require("./openai.service");
const openai_realtime_service_1 = require("./openai-realtime.service");
let OpenAIModule = class OpenAIModule {
};
exports.OpenAIModule = OpenAIModule;
exports.OpenAIModule = OpenAIModule = __decorate([
    (0, common_1.Module)({
        controllers: [openai_controller_1.OpenAIController],
        providers: [openai_service_1.OpenAIService, openai_realtime_service_1.OpenAIRealtimeService],
        exports: [openai_service_1.OpenAIService, openai_realtime_service_1.OpenAIRealtimeService],
    })
], OpenAIModule);
//# sourceMappingURL=openai.module.js.map