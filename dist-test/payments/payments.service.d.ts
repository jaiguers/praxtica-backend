import { Model } from 'mongoose';
import { PaymentDocument } from './schemas/payment.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PlansService } from '../plans/plans.service';
import { UserService } from '../auth/services/user.service';
export declare class PaymentsService {
    private paymentModel;
    private readonly plansService;
    private readonly userService;
    constructor(paymentModel: Model<PaymentDocument>, plansService: PlansService, userService: UserService);
    createPayment(createPaymentDto: CreatePaymentDto, userId: string): Promise<PaymentDocument>;
    getAllPayments(): Promise<PaymentDocument[]>;
    getPaymentsByUserId(userId: string): Promise<PaymentDocument[]>;
    getPaymentById(id: string): Promise<PaymentDocument>;
    updatePayment(id: string, updatePaymentDto: UpdatePaymentDto): Promise<PaymentDocument>;
    private updateUserSubscription;
    generatePaymentSignature(planId: string): Promise<string>;
    getPaymentByReference(reference: string): Promise<PaymentDocument>;
}
