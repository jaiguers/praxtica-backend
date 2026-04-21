import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './schemas/payment.schema';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    createPayment(createPaymentDto: CreatePaymentDto, req: any): Promise<Payment>;
    getAllPayments(): Promise<Payment[]>;
    getMyPayments(req: any): Promise<Payment[]>;
    getPaymentById(id: string): Promise<Payment>;
    getPaymentByReference(reference: string): Promise<Payment>;
    updatePayment(id: string, updatePaymentDto: UpdatePaymentDto): Promise<Payment>;
    generatePaymentSignature(planId: string): Promise<{
        signature: string;
    }>;
}
