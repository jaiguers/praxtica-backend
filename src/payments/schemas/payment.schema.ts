import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Plan', required: true })
  planId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  purchaseDate: Date;

  @Prop({ required: true })
  paymentMethod: string;

  @Prop({ required: true, unique: true })
  paymentReference: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ default: 'pending', enum: ['pending', 'completed', 'failed', 'cancelled'] })
  status: string;

  @Prop()
  transactionId?: string;

  @Prop()
  failureReason?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
