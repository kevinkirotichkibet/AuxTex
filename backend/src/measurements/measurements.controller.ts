import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MeasurementsService } from './measurements.service';
import { CreateMeasurementDto, UpdateMeasurementDto } from './dto/measurement.dto';

@UseGuards(JwtAuthGuard)
@Controller('measurements')
export class MeasurementsController {
  constructor(private measurementsService: MeasurementsService) {}

  @Get()
  findAll(@CurrentUser() user: { userId: string }) {
    return this.measurementsService.findAllForUser(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.measurementsService.findOneForUser(id, user.userId);
  }

  @Post()
  create(@Body() dto: CreateMeasurementDto, @CurrentUser() user: { userId: string }) {
    return this.measurementsService.create(user.userId, dto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMeasurementDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.measurementsService.update(id, user.userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.measurementsService.remove(id, user.userId);
  }
}
