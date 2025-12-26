import { IsNotEmpty, IsString } from 'class-validator';

export class RejectRequestDto {
  @IsNotEmpty({ message: 'Alasan penolakan wajib diisi' })
  @IsString()
  reason: string;
}
