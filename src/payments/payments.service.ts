import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PlansService } from '../plans/plans.service';
import { UserService } from '../auth/services/user.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private readonly plansService: PlansService,
    private readonly userService: UserService,
  ) {}

  async createPayment(createPaymentDto: CreatePaymentDto, userId: string): Promise<PaymentDocument> {
    const plan = await this.plansService.getPlanById(createPaymentDto.planId);
    if (!plan) {
      throw new Error('Plan no encontrado');
    }

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const paymentReference = uuidv4();
    const amountInCents = Math.round(createPaymentDto.amount * 100);

    const newPayment = new this.paymentModel({
      planId: new Types.ObjectId(createPaymentDto.planId),
      userId: new Types.ObjectId(userId),
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

  async getAllPayments(): Promise<PaymentDocument[]> {
    return this.paymentModel.find().populate('planId').populate('userId').exec();
  }

  async getPaymentsByUserId(userId: string): Promise<PaymentDocument[]> {
    return this.paymentModel.find({ userId: new Types.ObjectId(userId) })
      .populate('planId')
      .populate('userId')
      .exec();
  }

  async getPaymentById(id: string): Promise<PaymentDocument> {
    return this.paymentModel.findById(id).populate('planId').populate('userId').exec();
  }

  async updatePayment(id: string, updatePaymentDto: UpdatePaymentDto): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findByIdAndUpdate(
      id,
      updatePaymentDto,
      { new: true }
    ).populate('planId').populate('userId').exec();

    // Si el pago se completó, actualizar la suscripción del usuario
    if (updatePaymentDto.status === 'completed' && payment) {
      await this.updateUserSubscription(payment);
    }

    return payment;
  }

  private async updateUserSubscription(payment: PaymentDocument): Promise<void> {
    const user = await this.userService.findById(payment.userId.toString());
    const plan = await this.plansService.getPlanById(payment.planId.toString());

    if (!user || !plan) {
      throw new Error('Usuario o plan no encontrado');
    }

    // Calcular la fecha de finalización basada en el tipo de plan
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

    const allowedPlans = ['free', 'monthly', 'annual', 'enterprise'] as const;
    const planType = allowedPlans.includes(plan.type as any)
      ? (plan.type as (typeof allowedPlans)[number])
      : 'free';

    // Actualizar la suscripción del usuario
    user.subscription = {
      plan: planType,
      startDate,
      endDate,
      active: true,
    };

    await user.save();
  }

  async generatePaymentSignature(planId: string): Promise<string> {
    const plan = await this.plansService.getPlanById(planId);
    if (!plan) {
      throw new Error('Plan no encontrado');
    }

    const reference = uuidv4();
    const amountInCents = Math.round(plan.price * 100);
    const currency = 'COP';
    
    // Obtener la clave de integridad según el entorno
    const integrityKey = process.env.NODE_ENV === 'production' 
      ? process.env.WOMPI_INTEGRITY_KEY 
      : process.env.WOMPI_INTEGRITY_TEST_KEY;

    if (!integrityKey) {
      throw new Error('Clave de integridad no configurada');
    }

    // Concatenar los valores para generar la firma
    const signatureData = `${reference}${amountInCents}${currency}${integrityKey}`;
    const signature = crypto.createHash('sha256').update(signatureData).digest('hex');

    return signature;
  }

  async getPaymentByReference(reference: string): Promise<PaymentDocument> {
    return this.paymentModel.findOne({ paymentReference: reference })
      .populate('planId')
      .populate('userId')
      .exec();
  }
}
