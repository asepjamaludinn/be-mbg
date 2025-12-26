import { IsOptional, IsString, IsUUID } from 'class-validator';

export class StockFilterDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
