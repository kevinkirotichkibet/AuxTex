import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MeasurementProfile, MeasurementProfileSchema } from './measurement.schema';
import { MeasurementsService } from './measurements.service';
import { MeasurementsController } from './measurements.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MeasurementProfile.name, schema: MeasurementProfileSchema },
    ]),
  ],
  providers: [MeasurementsService],
  controllers: [MeasurementsController],
  exports: [MeasurementsService],
})
export class MeasurementsModule {}
