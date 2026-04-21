import { Document, Types } from 'mongoose';
export type PlanDocument = Plan & Document;
export declare class Plan {
    _id: Types.ObjectId;
    title: string;
    type: string;
    items: string[];
    price: number;
    active: boolean;
}
export declare const PlanSchema: import("mongoose").Schema<Plan, import("mongoose").Model<Plan, any, any, any, Document<unknown, any, Plan> & Plan & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Plan, Document<unknown, {}, import("mongoose").FlatRecord<Plan>> & import("mongoose").FlatRecord<Plan> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
