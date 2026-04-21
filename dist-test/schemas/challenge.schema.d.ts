import { Document } from 'mongoose';
export type ChallengeDocument = Challenge & Document;
export declare class Task {
    title: string;
    description: string;
    status: string;
}
export declare class ChallengeStep {
    title: string;
    description: string;
    status: string;
    isActive: boolean;
    tabs: {
        instructions?: {
            text: string;
            task: Task;
        };
        video?: string;
    };
}
export declare class Challenge {
    title: string;
    subtitle: string;
    description: string;
    image: string;
    type: string;
    level: string;
    steps: ChallengeStep[];
    active: boolean;
    createdAt: Date;
    repoUrl: string | null;
}
export declare const ChallengeSchema: import("mongoose").Schema<Challenge, import("mongoose").Model<Challenge, any, any, any, Document<unknown, any, Challenge> & Challenge & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Challenge, Document<unknown, {}, import("mongoose").FlatRecord<Challenge>> & import("mongoose").FlatRecord<Challenge> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
