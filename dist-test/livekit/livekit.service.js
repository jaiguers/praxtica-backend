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
var LiveKitService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveKitService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const livekit_server_sdk_1 = require("livekit-server-sdk");
let LiveKitService = LiveKitService_1 = class LiveKitService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(LiveKitService_1.name);
    }
    async generateToken(userId, sessionId, participantName) {
        const apiKey = this.configService.get('LIVEKIT_API_KEY');
        const apiSecret = this.configService.get('LIVEKIT_API_SECRET');
        if (!apiKey || !apiSecret) {
            this.logger.error('LiveKit API key or secret not configured');
            throw new Error('LiveKit configuration missing');
        }
        const at = new livekit_server_sdk_1.AccessToken(apiKey, apiSecret, {
            identity: userId,
            name: participantName || userId,
            metadata: JSON.stringify({ sessionId }),
        });
        at.addGrant({
            room: sessionId,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });
        return await at.toJwt();
    }
};
exports.LiveKitService = LiveKitService;
exports.LiveKitService = LiveKitService = LiveKitService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LiveKitService);
//# sourceMappingURL=livekit.service.js.map