import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateAuthDto {
  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  email: string;

  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  password: string;

  @IsNotEmpty({ message: 'Role wajib diisi' })
  @IsEnum(Role, {
    message: 'Role tidak valid. Pilihan: ADMIN_PUSAT, ADMIN_CABANG, KURIR',
  })
  role: Role;

  @IsOptional()
  @IsString()
  @IsUUID('4', { message: 'Branch ID harus format UUID v4 yang valid' })
  branchId?: string;
}
