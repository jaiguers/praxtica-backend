import { Document } from 'mongoose';
export type SubscriptionDocument = Subscription & Document;
export declare class Subscription {
    userId: string;
    plan: string;
    startDate: Date;
    endDate: Date;
    seats?: number;
    active: boolean;
    paymentId: string;
    paymentDetails: {
        amount: number;
        currency: string;
        paymentMethod: string;
        lastFour?: string;
    };
    enterpriseUsers?: string[];
}
export declare const SubscriptionSchema: import("mongoose").Schema<Subscription, import("mongoose").Model<Subscription, any, any, any, Document<unknown, any, Subscription> & Subscription & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Subscription, Document<unknown, {}, import("mongoose").FlatRecord<Subscription>> & import("mongoose").FlatRecord<Subscription> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
