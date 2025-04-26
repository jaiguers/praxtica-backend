import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChallengeDocument = Challenge & Document;

@Schema()
export class Task {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ default: 'pending' })
  status: string;
}

@Schema()
export class ChallengeStep {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ default: 'pending' })
  status: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object })
  tabs: {
    instructions?: {
      text: string;
      task: Task;
    };
    video?: string;
  };
}

@Schema()
export class Challenge {
  @Prop({ required: true })
  title: string;

  @Prop()
  subtitle: string;

  @Prop()
  description: string;

  @Prop()
  image: string;

  @Prop({ required: true, enum: ['git', 'english', 'spanish'] })
  type: string;

  @Prop({ required: true, enum: ['facil', 'intermedio', 'dificil', 'Todos los niveles'] })
  level: string;

  @Prop({ type: [ChallengeStep], default: [] })
  steps: ChallengeStep[];

  @Prop({ default: true })
  active: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: null })
  repoUrl: string | null;
}

export const ChallengeSchema = SchemaFactory.createForClass(Challenge); 