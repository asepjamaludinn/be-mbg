import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';

export class CreateDistributionDto {
  @IsNotEmpty({ message: 'School ID wajib diisi' })
  @IsUUID()
  schoolId: string;

  @IsNotEmpty({ message: 'Nama Kurir wajib diisi' })
  @IsString()
  courierName: string;

  @IsNotEmpty({ message: 'Jumlah wadah wajib diisi' })
  @IsInt()
  @Min(1, { message: 'Minimal mengirim 1 wadah' })
  containerCount: number;
}
