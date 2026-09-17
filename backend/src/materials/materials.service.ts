import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Material, MaterialDocument } from './material.schema';
import { CreateMaterialDto, FilterMaterialDto, UpdateMaterialDto } from './dto/material.dto';
import { Product, ProductDocument } from '../products/product.schema';
import { Order, OrderDocument } from '../orders/order.schema';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectModel(Material.name) private materialModel: Model<MaterialDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  findAll(filter: FilterMaterialDto) {
    const query: Record<string, unknown> = {};
    if (filter.type) query.type = filter.type;
    return this.materialModel.find(query).exec();
  }

  async findOne(id: string) {
    const material = await this.materialModel.findById(id).exec();
    if (!material) throw new NotFoundException('Material not found');
    return material;
  }

  create(dto: CreateMaterialDto) {
    return this.materialModel.create(dto);
  }

  async update(id: string, dto: UpdateMaterialDto) {
    const material = await this.materialModel.findById(id).exec();
    if (!material) throw new NotFoundException('Material not found');
    Object.assign(material, dto);
    return material.save();
  }

  async remove(id: string) {
    const material = await this.materialModel.findById(id).exec();
    if (!material) throw new NotFoundException('Material not found');

    // Deleting a material that's still referenced anywhere would leave a
    // dangling ObjectId — the product/order pages would then try to render
    // a material that no longer exists. Block it instead, with a clear
    // reason, rather than letting the catalog end up in a broken state.
    const [productsUsingIt, ordersUsingIt] = await Promise.all([
      this.productModel.countDocuments({ compatibleMaterials: id }).exec(),
      this.orderModel.countDocuments({ materialId: id }).exec(),
    ]);
    if (productsUsingIt > 0) {
      throw new BadRequestException(
        `Can't delete "${material.name}" — it's still linked to ${productsUsingIt} product(s). Remove it from those products first.`,
      );
    }
    if (ordersUsingIt > 0) {
      throw new BadRequestException(
        `Can't delete "${material.name}" — it's used by ${ordersUsingIt} existing order(s).`,
      );
    }

    await material.deleteOne();
    return { deleted: true };
  }
}
