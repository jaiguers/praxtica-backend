import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  githubId: string;

  @Prop({ required: true })
  username: string;

  @Prop()
  name?: string;

  @Prop()
  email: string;

  @Prop()
  avatarUrl: string;

  @Prop()
  githubAccessToken: string;

  @Prop({ type: Object, default: { plan: 'free', startDate: Date.now, endDate: Date.now, active: true } })
  subscription: {
    plan: string;
    startDate: Date;
    endDate: Date;
    active: boolean;
  };

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ type: Object })
  subscriptionDetails: {
    plan: 'monthly' | 'annual' | 'enterprise';
    startDate: Date;
    endDate: Date;
    seats?: number; // Para plan enterprise
    active: boolean;
  };

  @Prop({ type: [{ type: Object }] })
  challengeProgress: {
    challengeId: string;
    language: string;
    currentStep: number;
    completedSteps: number[];
    startedAt: Date;
    lastUpdated: Date;
  }[];
}

export const UserSchema = SchemaFactory.createForClass(User); 