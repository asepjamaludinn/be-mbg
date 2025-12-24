import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class UserFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  branchId?: string;
}
