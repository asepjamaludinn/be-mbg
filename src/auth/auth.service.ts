import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private prisma: PrismaService,
  ) {}

  async login(email: string, pass: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Email tidak ditemukan');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Password salah');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Akun Anda telah dinonaktifkan. Hubungi admin.',
      );
    }

    return this.generateToken(user);
  }

  async requestOtp(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) throw new UnauthorizedException('Email tidak terdaftar');

    if (!user.isActive) throw new UnauthorizedException('Akun non-aktif');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const salt = await bcrypt.genSalt();
    const otpHash = await bcrypt.hash(otp, salt);

    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 5);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash: otpHash,
        otpExpiresAt: expiration,
      },
    });

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Kode Verifikasi Masuk - Dapur MBG',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
            <h3 style="color: #333;">Halo, ${user.name}</h3>
            <p>Anda meminta kode verifikasi untuk masuk ke aplikasi Manajemen Dapur MBG.</p>
            <p>Gunakan kode berikut:</p>
            <h1 style="color: #0056b3; letter-spacing: 5px; font-size: 32px;">${otp}</h1>
            <p>Kode ini berlaku selama <strong>5 menit</strong>.</p>
            <hr />
            <p style="font-size: 12px; color: #777;">Jika Anda tidak merasa meminta kode ini, abaikan email ini.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Gagal kirim email:', error);
      throw new BadRequestException(
        'Gagal mengirim email OTP. Cek konfigurasi server.',
      );
    }

    return { message: 'OTP telah dikirim ke email Anda' };
  }

  async verifyOtp(email: string, otpInput: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) throw new UnauthorizedException('User tidak ditemukan');

    if (!user.otpHash || !user.otpExpiresAt) {
      throw new BadRequestException('Silakan request OTP ulang');
    }

    if (new Date() > user.otpExpiresAt) {
      throw new BadRequestException('OTP sudah kadaluwarsa. Minta baru.');
    }

    const isMatch = await bcrypt.compare(otpInput, user.otpHash);
    if (!isMatch) {
      throw new UnauthorizedException('Kode OTP salah');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpHash: null, otpExpiresAt: null },
    });

    return this.generateToken(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User tidak ditemukan');

    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) throw new BadRequestException('Password lama salah');

    const hashedNew = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNew },
    });

    return { message: 'Password berhasil diubah' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) throw new BadRequestException('Email tidak terdaftar');

    const tempPassword = this.usersService.generateStrongPassword(12);

    const hashed = await bcrypt.hash(tempPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Reset Password - Dapur MBG',
        html: `
           <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
             <h3 style="color: #333;">Permintaan Reset Password</h3>
             <p>Halo ${user.name}, kami menerima permintaan reset password untuk akun Anda.</p>
             <p>Password sementara Anda adalah:</p>
             <h2 style="color: #d9534f; background: #f9f9f9; padding: 10px; display: inline-block;">${tempPassword}</h2>
             <p>Segera login dan ganti password Anda demi keamanan.</p>
             <hr />
             <p style="font-size: 12px; color: #777;">Jika bukan Anda yang meminta, abaikan email ini.</p>
           </div>
        `,
      });
    } catch (e) {
      console.error('Gagal kirim email reset password:', e);
      throw new BadRequestException('Gagal mengirim email reset password');
    }

    return { message: 'Password baru telah dikirim ke email.' };
  }

  private async generateToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        branchId: user.branchId,
        profilePicture: user.profilePicture,
      },
    };
  }
}
