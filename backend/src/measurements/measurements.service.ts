import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MeasurementProfile, MeasurementProfileDocument } from './measurement.schema';
import { CreateMeasurementDto, UpdateMeasurementDto } from './dto/measurement.dto';

@Injectable()
export class MeasurementsService {
  constructor(
    @InjectModel(MeasurementProfile.name)
    private measurementModel: Model<MeasurementProfileDocument>,
  ) {}

  findAllForUser(userId: string) {
    return this.measurementModel.find({ userId }).exec();
  }

  async findOneForUser(id: string, userId: string) {
    const profile = await this.measurementModel.findById(id).exec();
    if (!profile) throw new NotFoundException('Measurement profile not found');
    if (profile.userId.toString() !== userId) throw new ForbiddenException();
    return profile;
  }

  create(userId: string, dto: CreateMeasurementDto) {
    return this.measurementModel.create({ ...dto, userId });
  }

  async update(id: string, userId: string, dto: UpdateMeasurementDto) {
    const profile = await this.findOneForUser(id, userId);
    Object.assign(profile, dto);
    return profile.save();
  }

  async remove(id: string, userId: string) {
    const profile = await this.findOneForUser(id, userId);
    await profile.deleteOne();
    return { deleted: true };
  }
}
