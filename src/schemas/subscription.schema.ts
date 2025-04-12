import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

@Schema()
export class Subscription {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, enum: ['monthly', 'annual', 'enterprise'] })
  plan: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop()
  seats?: number;

  @Prop({ required: true, default: true })
  active: boolean;

  @Prop()
  paymentId: string;

  @Prop({ type: Object })
  paymentDetails: {
    amount: number;
    currency: string;
    paymentMethod: string;
    lastFour?: string;
  };

  @Prop({ type: [String] })
  enterpriseUsers?: string[]; // IDs de usuarios para plan enterprise
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription); 