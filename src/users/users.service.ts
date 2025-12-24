import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
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

    const newUser = await this.prisma.user.create({
      data: { ...createUserDto, password: hashedPassword, isActive: true },
    });

    this.sendCredentialEmail(newUser, randomPassword);

    const { password, ...result } = newUser;
    return result;
  }

  private async sendCredentialEmail(user: any, pass: string) {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Kredensial Akun - Dapur MBG',
        html: `
          <h3>Halo, ${user.name}</h3>
          <p>Berikut adalah password akses Anda:</p>
          <h1>${pass}</h1>
          <p>Role: ${user.role}</p>
          <p style="color: red;">Segera ganti password setelah login.</p>
        `,
      });
    } catch (e) {
      console.error('Email error:', e);
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
      data: updateUserDto,
    });
  }

  async forceResetPassword(id: string) {
    const user = await this.findOne(id);

    const newPassword = this.generateStrongPassword(12);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Reset Password Admin - Dapur MBG',
        html: `
          <h3>Halo, ${user.name}</h3>
          <p>Admin telah mereset password Anda.</p>
          <p>Password Baru: <b>${newPassword}</b></p>
          <p>Silakan login dan segera ganti password ini.</p>
        `,
      });
    } catch (e) {
      console.error(e);
    }

    return { message: 'Password berhasil direset dan dikirim ke email user.' };
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
      data: { isActive: false },
    });
  }
}
