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

// All fields optional — an edit can touch just one field (e.g. only the
// price) without having to resend everything else.
export class UpdateMaterialDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  pricePerMeter?: number;

  @IsArray()
  @IsOptional()
  images?: string[];

  @IsNumber()
  @IsOptional()
  stock?: number;
}
