import { IsIn, IsMongoId, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsMongoId()
  productId: string;

  @IsMongoId()
  materialId: string;

  @IsMongoId()
  measurementProfileId: string;
}

// Customer-facing edit — only the material and/or measurement profile can
// change, and only while the order is still 'pending' (enforced in the
// service). The product itself isn't editable; place a new order for that.
export class UpdateOrderDto {
  @IsMongoId()
  @IsOptional()
  materialId?: string;

  @IsMongoId()
  @IsOptional()
  measurementProfileId?: string;
}

export class UpdateOrderStatusDto {
  @IsIn(['pending', 'in_production', 'shipped', 'delivered', 'cancelled'])
  status: string;
}
