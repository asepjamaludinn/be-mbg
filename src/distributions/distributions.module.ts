import { Module } from '@nestjs/common';
import { DistributionsService } from './distributions.service';
import { DistributionsController } from './distributions.controller';

@Module({
  controllers: [DistributionsController],
  providers: [DistributionsService],
})
export class DistributionsModule {}
