import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  category: string; // suit, shirt, trousers, blazer

  @Prop({ required: true })
  basePrice: number;

  @Prop()
  description: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: [Types.ObjectId], ref: 'Material', default: [] })
  compatibleMaterials: Types.ObjectId[];

  @Prop({ default: true })
  customizable: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
