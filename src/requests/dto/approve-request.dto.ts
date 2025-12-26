import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ApproveItemDto {
  @IsNotEmpty()
  @IsUUID()
  itemId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  qtyApproved: number;
}

export class ApproveRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApproveItemDto)
  items: ApproveItemDto[];
}
