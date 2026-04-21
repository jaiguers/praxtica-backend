import { Document, Types } from 'mongoose';
export type PaymentDocument = Payment & Document;
export declare class Payment {
    _id: Types.ObjectId;
    planId: Types.ObjectId;
    userId: Types.ObjectId;
    purchaseDate: Date;
    paymentMethod: string;
    paymentReference: string;
    amount: number;
    currency: string;
    status: string;
    transactionId?: string;
    failureReason?: string;
}
export declare const PaymentSchema: import("mongoose").Schema<Payment, import("mongoose").Model<Payment, any, any, any, Document<unknown, any, Payment> & Payment & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Payment, Document<unknown, {}, import("mongoose").FlatRecord<Payment>> & import("mongoose").FlatRecord<Payment> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
