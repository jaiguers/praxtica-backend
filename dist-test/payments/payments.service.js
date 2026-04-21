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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const payment_schema_1 = require("./schemas/payment.schema");
const plans_service_1 = require("../plans/plans.service");
const user_service_1 = require("../auth/services/user.service");
const uuid_1 = require("uuid");
const crypto = require("crypto");
let PaymentsService = class PaymentsService {
    constructor(paymentModel, plansService, userService) {
        this.paymentModel = paymentModel;
        this.plansService = plansService;
        this.userService = userService;
    }
    async createPayment(createPaymentDto, userId) {
        const plan = await this.plansService.getPlanById(createPaymentDto.planId);
        if (!plan) {
            throw new Error('Plan no encontrado');
        }
        const user = await this.userService.findById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }
        const paymentReference = (0, uuid_1.v4)();
        const amountInCents = Math.round(createPaymentDto.amount * 100);
        const newPayment = new this.paymentModel({
            planId: new mongoose_2.Types.ObjectId(createPaymentDto.planId),
            userId: new mongoose_2.Types.ObjectId(userId),
            purchaseDate: new Date(),
            paymentMethod: createPaymentDto.paymentMethod,
            paymentReference,
            amount: amountInCents,
            currency: createPaymentDto.currency || 'COP',
            status: 'pending',
            transactionId: createPaymentDto.transactionId,
        });
        return newPayment.save();
    }
    async getAllPayments() {
        return this.paymentModel.find().populate('planId').populate('userId').exec();
    }
    async getPaymentsByUserId(userId) {
        return this.paymentModel.find({ userId: new mongoose_2.Types.ObjectId(userId) })
            .populate('planId')
            .populate('userId')
            .exec();
    }
    async getPaymentById(id) {
        return this.paymentModel.findById(id).populate('planId').populate('userId').exec();
    }
    async updatePayment(id, updatePaymentDto) {
        const payment = await this.paymentModel.findByIdAndUpdate(id, updatePaymentDto, { new: true }).populate('planId').populate('userId').exec();
        if (updatePaymentDto.status === 'completed' && payment) {
            await this.updateUserSubscription(payment);
        }
        return payment;
    }
    async updateUserSubscription(payment) {
        const user = await this.userService.findById(payment.userId.toString());
        const plan = await this.plansService.getPlanById(payment.planId.toString());
        if (!user || !plan) {
            throw new Error('Usuario o plan no encontrado');
        }
        const startDate = new Date();
        let endDate = new Date();
        switch (plan.type) {
            case 'monthly':
                endDate.setMonth(endDate.getMonth() + 1);
                break;
            case 'annual':
                endDate.setFullYear(endDate.getFullYear() + 1);
                break;
            case 'enterprise':
                endDate.setFullYear(endDate.getFullYear() + 1);
                break;
            default:
                endDate.setMonth(endDate.getMonth() + 1);
        }
        const allowedPlans = ['free', 'monthly', 'annual', 'enterprise'];
        const planType = allowedPlans.includes(plan.type)
            ? plan.type
            : 'free';
        user.subscription = {
            plan: planType,
            startDate,
            endDate,
            active: true,
        };
        await user.save();
    }
    async generatePaymentSignature(planId) {
        const plan = await this.plansService.getPlanById(planId);
        if (!plan) {
            throw new Error('Plan no encontrado');
        }
        const reference = (0, uuid_1.v4)();
        const amountInCents = Math.round(plan.price * 100);
        const currency = 'COP';
        const integrityKey = process.env.NODE_ENV === 'production'
            ? process.env.WOMPI_INTEGRITY_KEY
            : process.env.WOMPI_INTEGRITY_TEST_KEY;
        if (!integrityKey) {
            throw new Error('Clave de integridad no configurada');
        }
        const signatureData = `${reference}${amountInCents}${currency}${integrityKey}`;
        const signature = crypto.createHash('sha256').update(signatureData).digest('hex');
        return signature;
    }
    async getPaymentByReference(reference) {
        return this.paymentModel.findOne({ paymentReference: reference })
            .populate('planId')
            .populate('userId')
            .exec();
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(payment_schema_1.Payment.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        plans_service_1.PlansService,
        user_service_1.UserService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map