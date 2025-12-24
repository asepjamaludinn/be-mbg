import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async login(email: string, pass: string) {
    const user = await this.usersService.findOneByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Email tidak ditemukan');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      await this.prisma.logActivity.create({
        data: {
          userId: user.id,
          action: 'LOGIN_FAILED',
          details: { reason: 'Invalid password attempt' },
        },
      });
      throw new UnauthorizedException('Password salah');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Akun Anda telah dinonaktifkan.');
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

    await this.prisma.logActivity.create({
      data: {
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        details: { loginAt: new Date() },
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        branchId: user.branchId,
        profilePicture: user.profilePicture,
      },
      backendTokens: tokens,
    };
  }

  async logout(userId: string) {
    await this.prisma.user.updateMany({
      where: { id: userId, refreshToken: { not: null } },
      data: { refreshToken: null },
    });

    await this.prisma.logActivity.create({
      data: {
        userId: userId,
        action: 'LOGOUT',
      },
    });

    return { message: 'Logout berhasil' };
  }

  async refreshTokens(userId: string, rt: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, refreshToken: true },
    });

    if (!user || !user.refreshToken)
      throw new ForbiddenException('Akses ditolak (No Token)');

    const rtMatches = await bcrypt.compare(rt, user.refreshToken);
    if (!rtMatches) throw new ForbiddenException('Refresh token tidak valid');

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

    return tokens;
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email);

    const genericResponse = {
      message:
        'Jika email terdaftar di sistem kami, instruksi reset password telah dikirim.',
    };

    if (!user) return genericResponse;

    const resetTokenPlain = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetTokenPlain, 10);
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 15);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            resetToken: resetTokenHash,
            resetTokenExpiresAt: expiry,
          },
        });

        await tx.logActivity.create({
          data: {
            userId: user.id,
            action: 'FORGOT_PASSWORD_REQUEST',
            details: { email },
          },
        });

        const frontendUrl =
          this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
        const resetLink = `${frontendUrl}/reset-password?token=${resetTokenPlain}&email=${email}`;

        await this.mailerService.sendMail({
          to: email,
          subject: 'Atur Ulang Password - Dapur MBG',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px;">
              <h3>Permintaan Atur Ulang Password</h3>
              <p>Halo ${user.name}, klik tombol di bawah untuk reset password:</p>
              <div style="margin: 20px 0;">
                <a href="${resetLink}" style="background: #007bff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
              </div>
              <p>Link berlaku selama 15 menit.</p>
            </div>
          `,
        });

        return genericResponse;
      });
    } catch (e) {
      console.error('Forgot Password Error:', e);
      throw new BadRequestException(
        'Gagal memproses permintaan reset password.',
      );
    }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.resetToken || !user.resetTokenExpiresAt) {
      throw new BadRequestException(
        'Permintaan atur ulang password tidak valid.',
      );
    }

    if (new Date() > user.resetTokenExpiresAt) {
      throw new BadRequestException('Token sudah kadaluwarsa');
    }

    const isTokenValid = await bcrypt.compare(dto.token, user.resetToken);
    if (!isTokenValid) {
      throw new BadRequestException('Token tidak valid');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiresAt: null,
            refreshToken: null,
          },
        });

        await tx.logActivity.create({
          data: {
            userId: user.id,
            action: 'RESET_PASSWORD_SUCCESS',
            details: { at: new Date() },
          },
        });

        return {
          message:
            'Password berhasil diperbarui. Sesi aktif lainnya telah dihentikan, silakan login kembali.',
        };
      });
    } catch (error) {
      console.error('Reset Password Error:', error);
      throw new BadRequestException('Gagal memperbarui password.');
    }
  }

  async getTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);
    return { access_token: at, refresh_token: rt };
  }

  async updateRefreshTokenHash(userId: string, rt: string) {
    const hash = await bcrypt.hash(rt, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hash },
    });
  }

  async requestOtp(email: string) {
    const user = await this.usersService.findOneByEmail(email);

    if (!user || !user.isActive) {
      return { message: 'Jika email terdaftar, OTP telah dikirim.' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 5);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { otpHash, otpExpiresAt: expiration },
        });

        await tx.logActivity.create({
          data: {
            userId: user.id,
            action: 'OTP_REQUESTED',
          },
        });

        await this.mailerService.sendMail({
          to: email,
          subject: 'Kode Verifikasi - Dapur MBG',
          html: `<h3>Kode OTP Anda: ${otp}</h3><p>Berlaku selama 5 menit.</p>`,
        });

        return { message: 'Jika email terdaftar, OTP telah dikirim.' };
      });
    } catch (e) {
      console.error('OTP Request Error:', e);
      throw new BadRequestException('Gagal mengirim email OTP.');
    }
  }

  async verifyOtp(email: string, otpInput: string) {
    const user = await this.usersService.findOneByEmail(email);

    if (
      !user ||
      !user.otpHash ||
      !user.otpExpiresAt ||
      new Date() > user.otpExpiresAt
    ) {
      throw new BadRequestException('OTP tidak valid/kadaluwarsa');
    }

    const isMatch = await bcrypt.compare(otpInput, user.otpHash);
    if (!isMatch) throw new UnauthorizedException('Kode OTP salah');

    await this.prisma.logActivity.create({
      data: {
        userId: user.id,
        action: 'OTP_VERIFIED_SUCCESS',
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpHash: null, otpExpiresAt: null },
    });

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

    return {
      user: { id: user.id, name: user.name, role: user.role },
      backendTokens: tokens,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new UnauthorizedException('User tidak ditemukan');

    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) {
      await this.prisma.logActivity.create({
        data: {
          userId: userId,
          action: 'PASSWORD_CHANGE_FAILED',
          details: { reason: 'Old password incorrect' },
        },
      });
      throw new BadRequestException('Password lama salah');
    }

    const hashedNew = await bcrypt.hash(dto.newPassword, 10);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            password: hashedNew,
            refreshToken: null,
          },
        });

        await tx.logActivity.create({
          data: {
            userId: userId,
            action: 'PASSWORD_CHANGE_MANUAL_SUCCESS',
          },
        });

        return {
          message:
            'Password berhasil diubah. Silakan login kembali dengan password baru.',
        };
      });
    } catch (error) {
      throw new BadRequestException('Gagal mengubah password.');
    }
  }
}
