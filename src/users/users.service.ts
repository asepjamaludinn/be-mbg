import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Prisma, Role } from '@prisma/client';
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

  async create(createUserDto: CreateUserDto, adminId: string) {
    const adminAccount = await this.prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!adminAccount)
      throw new UnauthorizedException('Admin tidak ditemukan.');

    if (adminAccount.role === Role.ADMIN_CABANG) {
      if (createUserDto.role !== Role.KURIR) {
        throw new ForbiddenException(
          'Wewenang terbatas: Admin Cabang hanya diperbolehkan mendaftarkan akun KURIR.',
        );
      }

      if (createUserDto.branchId !== adminAccount.branchId) {
        throw new ForbiddenException(
          'Wewenang terbatas: Anda hanya bisa mendaftarkan user untuk kantor cabang Anda sendiri.',
        );
      }
    }

    if (
      (createUserDto.role === Role.ADMIN_CABANG ||
        createUserDto.role === Role.KURIR) &&
      !createUserDto.branchId
    ) {
      throw new BadRequestException(
        'User dengan role Admin Cabang atau Kurir WAJIB memiliki Branch ID (Penempatan Tugas).',
      );
    }

    if (createUserDto.role === Role.ADMIN_PUSAT && createUserDto.branchId) {
      createUserDto.branchId = undefined;
    }

    const { email, phoneNumber, identityNumber } = createUserDto;
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phoneNumber }, { identityNumber }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email)
        throw new ConflictException('Email sudah terdaftar dalam sistem.');
      if (existingUser.phoneNumber === phoneNumber)
        throw new ConflictException('Nomor HP sudah terdaftar dalam sistem.');
      if (existingUser.identityNumber === identityNumber)
        throw new ConflictException('NIK sudah terdaftar dalam sistem.');
    }

    const temporaryPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    const activationTokenPlain = crypto.randomBytes(32).toString('hex');
    const activationTokenHash = await bcrypt.hash(activationTokenPlain, 10);
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            ...createUserDto,
            password: hashedPassword,
            isActive: true,
            resetToken: activationTokenHash,
            resetTokenExpiresAt: expiry,
          },
        });

        await tx.logActivity.create({
          data: {
            userId: adminId,
            action: 'CREATE_USER_LINK_SENT',
            details: {
              targetUserId: newUser.id,
              targetEmail: newUser.email,
              targetNik: newUser.identityNumber,
              role: newUser.role,
              branchId: newUser.branchId,
            },
          },
        });

        await this.sendActivationEmail(newUser, activationTokenPlain);

        const { password, resetToken, ...result } = newUser;
        return result;
      });
    } catch (error) {
      console.error('Create User Error:', error);
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Gagal membuat user karena kendala teknis atau pengiriman email.',
      );
    }
  }

  private async sendActivationEmail(user: any, token: string) {
    const frontendUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const activationLink = `${frontendUrl}/reset-password?token=${token}&email=${user.email}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Aktivasi Akun - Dapur MBG',
      html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; max-width: 600px;">
            <h2 style="color: #2c3e50;">Halo, ${user.name}!</h2>
            <p>Akun Anda di <b>Manajemen Dapur MBG</b> telah berhasil didaftarkan oleh Admin.</p>
            <p>Silakan klik tombol di bawah ini untuk membuat password Anda dan mengaktifkan akun:</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${activationLink}" style="background-color: #27ae60; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Buat Password Saya</a>
            </div>
            <p>Link ini berlaku selama 24 jam. Segera aktivasi akun Anda demi keamanan.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"/>
            <p style="font-size: 12px; color: #7f8c8d;">Role Anda: <b>${user.role}</b><br>NIK: ${user.identityNumber}</p>
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

        await tx.logActivity.create({
          data: {
            userId: user.id,
            action: 'FORCE_RESET_BY_ADMIN',
            details: { targetEmail: user.email, expiry },
          },
        });

        const frontendUrl =
          this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
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
        role ? { role } : {},
        branchId ? { branchId } : {},
        search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { identityNumber: { contains: search, mode: 'insensitive' } },
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
      data: { isActive: false, refreshToken: null },
    });
  }
}
