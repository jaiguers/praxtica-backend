import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true })
  githubId: string;

  @Prop({ required: true })
  username: string;

  @Prop()
  email: string;

  @Prop()
  name?: string;

  @Prop()
  avatarUrl: string;

  @Prop()
  githubAccessToken: string;

  @Prop({ type: Object })
  subscription: {
    plan: 'free' | 'monthly' | 'annual' | 'enterprise';
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