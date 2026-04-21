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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChallengeSchema = exports.Challenge = exports.ChallengeStep = exports.Task = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Task = class Task {
};
exports.Task = Task;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Task.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Task.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'pending' }),
    __metadata("design:type", String)
], Task.prototype, "status", void 0);
exports.Task = Task = __decorate([
    (0, mongoose_1.Schema)()
], Task);
let ChallengeStep = class ChallengeStep {
};
exports.ChallengeStep = ChallengeStep;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ChallengeStep.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ChallengeStep.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'pending' }),
    __metadata("design:type", String)
], ChallengeStep.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], ChallengeStep.prototype, "isActive", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], ChallengeStep.prototype, "tabs", void 0);
exports.ChallengeStep = ChallengeStep = __decorate([
    (0, mongoose_1.Schema)()
], ChallengeStep);
let Challenge = class Challenge {
};
exports.Challenge = Challenge;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Challenge.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Challenge.prototype, "subtitle", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Challenge.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Challenge.prototype, "image", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['git', 'english', 'spanish'] }),
    __metadata("design:type", String)
], Challenge.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['facil', 'intermedio', 'dificil', 'Todos los niveles'] }),
    __metadata("design:type", String)
], Challenge.prototype, "level", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [ChallengeStep], default: [] }),
    __metadata("design:type", Array)
], Challenge.prototype, "steps", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], Challenge.prototype, "active", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], Challenge.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: null }),
    __metadata("design:type", String)
], Challenge.prototype, "repoUrl", void 0);
exports.Challenge = Challenge = __decorate([
    (0, mongoose_1.Schema)()
], Challenge);
exports.ChallengeSchema = mongoose_1.SchemaFactory.createForClass(Challenge);
//# sourceMappingURL=challenge.schema.js.map