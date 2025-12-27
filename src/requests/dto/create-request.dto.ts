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
import { ApiProperty } from '@nestjs/swagger';

class RequestItemDto {
  @ApiProperty({ example: 'uuid-material-123', description: 'ID Material' })
  @IsNotEmpty({ message: 'Material ID wajib diisi' })
  @IsUUID()
  materialId: string;

  @ApiProperty({ example: 10, description: 'Jumlah permintaan' })
  @IsNotEmpty({ message: 'Qty wajib diisi' })
  @IsNumber()
  @Min(0.1, { message: 'Jumlah permintaan harus lebih dari 0' })
  qty: number;
}

export class CreateRequestDto {
  @ApiProperty({
    type: [RequestItemDto],
    description: 'List barang yang diminta',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequestItemDto)
  items: RequestItemDto[];

  @ApiProperty({ example: 'Butuh cepat untuk event besok', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
