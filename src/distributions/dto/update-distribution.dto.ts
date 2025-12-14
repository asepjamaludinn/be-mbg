import { PartialType } from '@nestjs/mapped-types';
import { CreateDistributionDto } from './create-distribution.dto';

export class UpdateDistributionDto extends PartialType(CreateDistributionDto) {}
