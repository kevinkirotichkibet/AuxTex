import { IsMongoId } from 'class-validator';

export class CreateOrderDto {
  @IsMongoId()
  productId: string;

  @IsMongoId()
  materialId: string;

  @IsMongoId()
  measurementProfileId: string;
}
