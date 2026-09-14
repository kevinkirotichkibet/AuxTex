import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto, FilterMaterialDto } from './dto/material.dto';

@Controller('materials')
export class MaterialsController {
  constructor(private materialsService: MaterialsService) {}

  @Get()
  findAll(@Query() query: FilterMaterialDto) {
    return this.materialsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.materialsService.findOne(id);
  }

  // In production, protect this with an admin-only guard
  @Post()
  create(@Body() dto: CreateMaterialDto) {
    return this.materialsService.create(dto);
  }
}
