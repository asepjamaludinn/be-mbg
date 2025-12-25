import { PartialType } from '@nestjs/mapped-types';
import { CreateMaterialDto } from './create-material.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
