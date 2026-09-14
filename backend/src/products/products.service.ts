import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './product.schema';
import { CreateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private productModel: Model<ProductDocument>) {}

  findAll(category?: string) {
    const query: Record<string, unknown> = {};
    if (category) query.category = category;
    return this.productModel.find(query).populate('compatibleMaterials').exec();
  }

  async findOne(id: string) {
    const product = await this.productModel
      .findById(id)
      .populate('compatibleMaterials')
      .exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  create(dto: CreateProductDto) {
    return this.productModel.create(dto);
  }
}
