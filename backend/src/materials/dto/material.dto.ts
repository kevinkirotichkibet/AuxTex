import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class FilterMaterialDto {
  @IsOptional()
  @IsString()
  type?: string;
}

export class CreateMaterialDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsString()
  color: string;

  @IsNumber()
  pricePerMeter: number;

  @IsArray()
  @IsOptional()
  images?: string[];

  @IsNumber()
  @IsOptional()
  stock?: number;
}
