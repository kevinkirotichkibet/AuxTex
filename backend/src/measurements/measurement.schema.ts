import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MeasurementProfileDocument = MeasurementProfile & Document;

@Schema({ timestamps: true })
export class MeasurementProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  label: string; // e.g. "My suit measurements", "Dad's measurements"

  @Prop({ enum: ['cm', 'in'], default: 'cm' })
  unit: string;

  @Prop({ required: true })
  chest: number;

  @Prop({ required: true })
  waist: number;

  @Prop({ required: true })
  hips: number;

  @Prop()
  shoulderWidth: number;

  @Prop()
  sleeveLength: number;

  @Prop()
  inseam: number;

  @Prop()
  neck: number;

  @Prop()
  height: number;

  @Prop()
  notes?: string;
}

export const MeasurementProfileSchema = SchemaFactory.createForClass(MeasurementProfile);
