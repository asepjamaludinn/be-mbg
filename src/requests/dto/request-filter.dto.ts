import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { RequestStatus } from '@prisma/client';

export class RequestFilterDto {
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}
