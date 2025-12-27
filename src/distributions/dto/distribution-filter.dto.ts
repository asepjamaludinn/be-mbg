import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { DistributionStatus } from '@prisma/client';

export class DistributionFilterDto {
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @IsOptional()
  @IsEnum(DistributionStatus)
  status?: DistributionStatus;

  @IsOptional()
  @IsString()
  date?: string;
}
