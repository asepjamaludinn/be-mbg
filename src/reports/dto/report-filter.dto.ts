import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class ReportFilterDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}
