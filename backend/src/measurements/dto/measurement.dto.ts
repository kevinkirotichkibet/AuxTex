import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMeasurementDto {
  @IsString()
  label: string;

  @IsIn(['cm', 'in'])
  @IsOptional()
  unit?: string;

  @IsIn(['male', 'female'])
  @IsOptional()
  gender?: string;

  @IsNumber()
  chest: number;

  @IsNumber()
  waist: number;

  @IsNumber()
  hips: number;

  @IsNumber()
  @IsOptional()
  shoulderWidth?: number;

  @IsNumber()
  @IsOptional()
  sleeveLength?: number;

  @IsNumber()
  @IsOptional()
  inseam?: number;

  @IsNumber()
  @IsOptional()
  neck?: number;

  @IsNumber()
  @IsOptional()
  height?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateMeasurementDto extends CreateMeasurementDto {}
