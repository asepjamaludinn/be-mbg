import { Injectable } from '@nestjs/common';
import { CreateDistributionDto } from './dto/create-distribution.dto';
import { UpdateDistributionDto } from './dto/update-distribution.dto';

@Injectable()
export class DistributionsService {
  create(createDistributionDto: CreateDistributionDto) {
    return 'This action adds a new distribution';
  }

  findAll() {
    return `This action returns all distributions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} distribution`;
  }

  update(id: number, updateDistributionDto: UpdateDistributionDto) {
    return `This action updates a #${id} distribution`;
  }

  remove(id: number) {
    return `This action removes a #${id} distribution`;
  }
}
