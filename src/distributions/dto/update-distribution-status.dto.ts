import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class UpdateDistributionStatusDto {
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  returnedContainer: number;
}
