import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  public generateStrongPassword(length = 12): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
    const allChars = upper + lower + numbers + symbols;

    let password = '';
    password += upper[crypto.randomInt(0, upper.length)];
    password += lower[crypto.randomInt(0, lower.length)];
    password += numbers[crypto.randomInt(0, numbers.length)];
    password += symbols[crypto.randomInt(0, symbols.length)];

    for (let i = 4; i < length; i++) {
      password += allChars[crypto.randomInt(0, allChars.length)];
    }

    return password
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('');
  }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (existingUser) throw new ConflictException('Email sudah terdaftar');

    const randomPassword = this.generateStrongPassword(12);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: { ...createUserDto, password: hashedPassword, isActive: true },
        });

        await this.sendCredentialEmail(newUser, randomPassword);

        const { password, ...result } = newUser;
        return result;
      });
    } catch (error) {
      console.error('Create User Error:', error);
      throw new BadRequestException(
        'Gagal membuat user karena sistem email bermasalah.',
      );
    }
  }

  private async sendCredentialEmail(user: any, pass: string) {
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Kredensial Akun - Dapur MBG',
      html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
            <h3>Halo, ${user.name}</h3>
            <p>Akun Anda telah dibuat oleh Admin. Berikut adalah password sementara Anda:</p>
            <h2 style="color: #2c3e50; background: #ecf0f1; padding: 10px; display: inline-block;">${pass}</h2>
            <p>Role: <b>${user.role}</b></p>
            <p style="color: red;">Segera ganti password Anda setelah login pertama kali demi keamanan.</p>
          </div>
        `,
    });
  }

  async forceResetPassword(id: string) {
    const user = await this.findOne(id);

    const resetTokenPlain = crypto.randomBytes(32).toString('hex');

    const resetTokenHash = await bcrypt.hash(resetTokenPlain, 10);

    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 30);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            resetToken: resetTokenHash,
            resetTokenExpiresAt: expiry,
            refreshToken: null,
          },
        });

        const frontendUrl =
          this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
        // Kirim Token PLAIN ke URL email
        const resetLink = `${frontendUrl}/reset-password?token=${resetTokenPlain}&email=${user.email}`;

        await this.mailerService.sendMail({
          to: user.email,
          subject: 'Instruksi Atur Ulang Password - Dapur MBG',
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
              <h3>Halo, ${user.name}</h3>
              <p>Admin telah memicu pengaturan ulang password untuk akun Anda. Sesi login Anda saat ini telah dihentikan demi keamanan.</p>
              <p>Silakan klik tombol di bawah ini untuk membuat password baru:</p>
              <div style="margin: 30px 0;">
                <a href="${resetLink}" style="background: #e74c3c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Buat Password Baru</a>
              </div>
              <p>Link ini hanya berlaku selama 30 menit.</p>
              <hr/>
              <p><small>Jika Anda tidak merasa meminta ini, silakan hubungi IT Support.</small></p>
            </div>
          `,
        });

        return {
          message:
            'Link reset password telah dikirim. Semua sesi user telah dihentikan.',
        };
      });
    } catch (e) {
      console.error('Force Reset Error:', e);
      throw new BadRequestException(
        'Gagal memproses pengaturan ulang password.',
      );
    }
  }

  async findAll(filter: UserFilterDto) {
    const { search, role, branchId } = filter;
    const where: Prisma.UserWhereInput = {
      AND: [
        role ? { role: role } : {},
        branchId ? { branchId: branchId } : {},
        search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    };
    return this.prisma.user.findMany({
      where,
      include: { branch: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { branch: true },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return user;
  }

  async findOneByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { branch: true },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        refreshToken: updateUserDto.password ? null : undefined,
      },
    });
  }

  async updateProfilePicture(id: string, url: string) {
    return this.prisma.user.update({
      where: { id },
      data: { profilePicture: url },
    });
  }

  async remove(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        refreshToken: null,
      },
    });
  }
}
