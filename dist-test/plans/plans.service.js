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
exports.PlansService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const plan_schema_1 = require("./schemas/plan.schema");
let PlansService = class PlansService {
    constructor(planModel) {
        this.planModel = planModel;
    }
    async createPlan(createPlanDto) {
        const newPlan = new this.planModel(createPlanDto);
        return newPlan.save();
    }
    async getAllPlans() {
        return this.planModel.find({ active: true }).exec();
    }
    async getPlanById(id) {
        return this.planModel.findById(id).exec();
    }
    async updatePlan(id, updatePlanDto) {
        return this.planModel.findByIdAndUpdate(id, updatePlanDto, { new: true }).exec();
    }
    async deletePlan(id) {
        return this.planModel.findByIdAndUpdate(id, { active: false }, { new: true }).exec();
    }
};
exports.PlansService = PlansService;
exports.PlansService = PlansService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(plan_schema_1.Plan.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], PlansService);
//# sourceMappingURL=plans.service.js.map