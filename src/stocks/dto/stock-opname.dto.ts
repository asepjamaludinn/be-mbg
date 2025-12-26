import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class StockOpnameDto {
  @IsNotEmpty({ message: 'Branch ID wajib diisi' })
  @IsUUID()
  branchId: string;

  @IsNotEmpty({ message: 'Material ID wajib diisi' })
  @IsUUID()
  materialId: string;

  @IsNotEmpty({ message: 'Jumlah stok wajib diisi' })
  @IsNumber()
  @Min(0, { message: 'Jumlah stok tidak boleh negatif' })
  qty: number;

  @IsNotEmpty({ message: 'Alasan perubahan stok wajib diisi' })
  @IsString()
  reason: string;
}
