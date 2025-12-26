import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class RequestItemDto {
  @IsNotEmpty({ message: 'Material ID wajib diisi' })
  @IsUUID()
  materialId: string;

  @IsNotEmpty({ message: 'Qty wajib diisi' })
  @IsNumber()
  @Min(0.1, { message: 'Jumlah permintaan harus lebih dari 0' })
  qty: number;
}

export class CreateRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequestItemDto)
  items: RequestItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
