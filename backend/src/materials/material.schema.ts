import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MaterialDocument = Material & Document;

@Schema({ timestamps: true })
export class Material {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  type: string; // wool, cotton, linen, silk, etc.

  @Prop({ required: true })
  color: string;

  @Prop({ required: true })
  pricePerMeter: number;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: 0 })
  stock: number;
}

export const MaterialSchema = SchemaFactory.createForClass(Material);
