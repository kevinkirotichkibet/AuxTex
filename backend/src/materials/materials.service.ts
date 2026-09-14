import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Material, MaterialDocument } from './material.schema';
import { CreateMaterialDto, FilterMaterialDto } from './dto/material.dto';

@Injectable()
export class MaterialsService {
  constructor(@InjectModel(Material.name) private materialModel: Model<MaterialDocument>) {}

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
}
