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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveKitController = void 0;
const common_1 = require("@nestjs/common");
const livekit_service_1 = require("./livekit.service");
const jwt_guard_1 = require("../auth/jwt.guard");
let LiveKitController = class LiveKitController {
    constructor(livekitService) {
        this.livekitService = livekitService;
    }
    async getToken(req, body) {
        const userId = req.user.id || req.user.sub || req.user.userId;
        const sessionId = body.sessionId || body.roomName;
        if (!sessionId) {
            console.error('❌ [LiveKitController] Error: sessionId o roomName no proporcionado en el body:', body);
            throw new common_1.BadRequestException('sessionId or roomName is required');
        }
        const token = await this.livekitService.generateToken(String(userId), sessionId, body.participantName);
        return { token };
    }
};
exports.LiveKitController = LiveKitController;
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)('token'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LiveKitController.prototype, "getToken", null);
exports.LiveKitController = LiveKitController = __decorate([
    (0, common_1.Controller)('api/livekit'),
    __metadata("design:paramtypes", [livekit_service_1.LiveKitService])
], LiveKitController);
//# sourceMappingURL=livekit.controller.js.map