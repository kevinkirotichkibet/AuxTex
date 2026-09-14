import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './order.schema';
import { CreateOrderDto } from './dto/order.dto';
import { ProductsService } from '../products/products.service';
import { MaterialsService } from '../materials/materials.service';
import { MeasurementsService } from '../measurements/measurements.service';

// Rough fabric usage per garment category, in meters. Tune to taste.
// Keep this in sync with FABRIC_USAGE_METERS in
// frontend/app/products/[id]/page.tsx, since the frontend shows a price
// estimate using the same table before the order is actually placed.
const FABRIC_USAGE_METERS: Record<string, number> = {
  suit: 3.5,
  blazer: 2.2,
  trousers: 1.5,
  shirt: 1.8,
  dress: 2.8,
  skirt: 1.2,
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private productsService: ProductsService,
    private materialsService: MaterialsService,
    private measurementsService: MeasurementsService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    const product = await this.productsService.findOne(dto.productId);
    const material = await this.materialsService.findOne(dto.materialId);
    // Ensures the profile belongs to this user; throws otherwise
    await this.measurementsService.findOneForUser(dto.measurementProfileId, userId);

    const usage = FABRIC_USAGE_METERS[product.category] ?? 2;
    const price = product.basePrice + material.pricePerMeter * usage;

    return this.orderModel.create({
      userId,
      productId: dto.productId,
      materialId: dto.materialId,
      measurementProfileId: dto.measurementProfileId,
      price: Math.round(price * 100) / 100,
    });
  }

  findAllForUser(userId: string) {
    return this.orderModel
      .find({ userId })
      .populate('productId')
      .populate('materialId')
      .populate('measurementProfileId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOneForUser(id: string, userId: string) {
    const order = await this.orderModel
      .findOne({ _id: id, userId })
      .populate('productId')
      .populate('materialId')
      .populate('measurementProfileId')
      .exec();
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
