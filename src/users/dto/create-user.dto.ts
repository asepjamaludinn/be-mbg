import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  name: string;

  @IsEnum(Role, { message: 'Role tidak valid' })
  role: Role;

  @IsOptional()
  @IsUUID('4', { message: 'Branch ID harus format UUID yang valid' })
  branchId?: string;

  @IsNotEmpty({ message: 'Nomor HP tidak boleh kosong' })
  @IsString()
  @Matches(/^\+62[0-9]{9,13}$/, {
    message: 'Nomor HP harus diawali +62 dan diikuti 9-13 digit angka',
  })
  phoneNumber: string;

  @IsNotEmpty({ message: 'NIK tidak boleh kosong' })
  @IsString()
  @Matches(/^[0-9]{16}$/, {
    message: 'NIK harus terdiri dari tepat 16 digit angka',
  })
  identityNumber: string;
}
