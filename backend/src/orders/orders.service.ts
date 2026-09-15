import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './order.schema';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
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

const CANCELLABLE_STATUSES = ['pending', 'in_production'];
const EDITABLE_STATUSES = ['pending'];

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private productsService: ProductsService,
    private materialsService: MaterialsService,
    private measurementsService: MeasurementsService,
  ) {}

  private computePrice(basePrice: number, category: string, pricePerMeter: number): number {
    const usage = FABRIC_USAGE_METERS[category] ?? 2;
    return Math.round((basePrice + pricePerMeter * usage) * 100) / 100;
  }

  async create(userId: string, dto: CreateOrderDto) {
    const product = await this.productsService.findOne(dto.productId);
    const material = await this.materialsService.findOne(dto.materialId);
    // Ensures the profile belongs to this user; throws otherwise
    await this.measurementsService.findOneForUser(dto.measurementProfileId, userId);

    const price = this.computePrice(product.basePrice, product.category, material.pricePerMeter);

    return this.orderModel.create({
      userId,
      productId: dto.productId,
      materialId: dto.materialId,
      measurementProfileId: dto.measurementProfileId,
      price,
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

  // Lets a customer swap the material and/or measurement profile on their
  // own order, recomputing price server-side — but only while it's still
  // 'pending', since production may already be under way after that.
  async update(id: string, userId: string, dto: UpdateOrderDto) {
    const order = await this.orderModel.findOne({ _id: id, userId }).exec();
    if (!order) throw new NotFoundException('Order not found');
    if (!EDITABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException('Only pending orders can be edited');
    }

    const product = await this.productsService.findOne(order.productId.toString());

    if (dto.materialId) {
      await this.materialsService.findOne(dto.materialId); // throws if invalid
      order.materialId = dto.materialId as any;
    }
    if (dto.measurementProfileId) {
      // Ownership-checked — throws if the profile isn't this user's
      await this.measurementsService.findOneForUser(dto.measurementProfileId, userId);
      order.measurementProfileId = dto.measurementProfileId as any;
    }

    const material = await this.materialsService.findOne(order.materialId.toString());
    order.price = this.computePrice(product.basePrice, product.category, material.pricePerMeter);

    await order.save();
    return this.findOneForUser(id, userId);
  }

  async cancel(id: string, userId: string) {
    const order = await this.orderModel.findOne({ _id: id, userId }).exec();
    if (!order) throw new NotFoundException('Order not found');
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException(`Orders that are already '${order.status}' can't be cancelled`);
    }
    order.status = 'cancelled';
    await order.save();
    return order;
  }

  // Admin: every order, with enough customer detail (name/email) to know
  // who placed it, plus the product/material/measurements they chose.
  findAllForAdmin() {
    return this.orderModel
      .find()
      .populate('userId', 'name email')
      .populate('productId')
      .populate('materialId')
      .populate('measurementProfileId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateStatus(id: string, status: string) {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Order not found');
    order.status = status;
    await order.save();
    return order;
  }
}
