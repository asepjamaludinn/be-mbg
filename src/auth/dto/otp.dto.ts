import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class RequestOtpDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class VerifyOtpDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'Kode OTP harus 6 digit' })
  otp: string;
}
