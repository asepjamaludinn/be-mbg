import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDistributionDto } from './dto/create-distribution.dto';
import { UpdateDistributionStatusDto } from './dto/update-distribution-status.dto';
import { DistributionFilterDto } from './dto/distribution-filter.dto';
import { Prisma, Role, DistributionStatus } from '@prisma/client';

@Injectable()
export class DistributionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDistributionDto, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { branch: true },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan.');
    }

    if (user.role !== Role.ADMIN_CABANG) {
      throw new ForbiddenException(
        'Hanya Admin Cabang yang bisa melakukan distribusi.',
      );
    }

    if (!user.branch || !user.branch.isActive) {
      throw new BadRequestException('Cabang tidak valid atau tidak aktif.');
    }

    if (!user.branchId) {
      throw new BadRequestException(
        'User tidak terikat dengan cabang manapun.',
      );
    }

    const school = await this.prisma.school.findUnique({
      where: { id: dto.schoolId },
    });

    if (!school || !school.isActive) {
      throw new NotFoundException('Sekolah tidak ditemukan atau tidak aktif.');
    }

    return await this.prisma.$transaction(async (tx) => {
      const distribution = await tx.distribution.create({
        data: {
          branchId: user.branchId!,
          schoolId: dto.schoolId,
          courierName: dto.courierName,
          containerCount: dto.containerCount,
          status: DistributionStatus.DIKIRIM,
          sentAt: new Date(),
        },
        include: { school: true },
      });

      await tx.logActivity.create({
        data: {
          userId,
          action: 'DISTRIBUTION_SENT',
          details: {
            distributionId: distribution.id,
            school: school.name,
            containers: dto.containerCount,
            courier: dto.courierName,
          },
        },
      });

      return distribution;
    });
  }

  async findAll(
    page: number,
    limit: number,
    filter: DistributionFilterDto,
    user: any,
  ) {
    const skip = (page - 1) * limit;
    const { schoolId, status, date } = filter;

    const where: Prisma.DistributionWhereInput = {
      branchId: user.role === Role.ADMIN_CABANG ? user.branchId : undefined,
      ...(schoolId ? { schoolId } : {}),
      ...(status ? { status } : {}),
      ...(date
        ? {
            sentAt: {
              gte: new Date(date),
              lte: new Date(new Date(date).setHours(23, 59, 59)),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.distribution.findMany({
        where,
        skip,
        take: limit,
        include: {
          school: { select: { name: true, address: true } },
          branch: { select: { name: true } },
        },
        orderBy: { sentAt: 'desc' },
      }),
      this.prisma.distribution.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: any) {
    const distribution = await this.prisma.distribution.findUnique({
      where: { id },
      include: { school: true, branch: true },
    });

    if (!distribution) {
      throw new NotFoundException('Data distribusi tidak ditemukan');
    }

    if (
      user &&
      user.role === Role.ADMIN_CABANG &&
      distribution.branchId !== user.branchId
    ) {
      throw new ForbiddenException(
        'Akses ditolak: Data ini milik cabang lain.',
      );
    }

    return distribution;
  }

  async updateReturnStatus(
    id: string,
    dto: UpdateDistributionStatusDto,
    userId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.branchId) {
      throw new ForbiddenException(
        'User tidak valid atau tidak memiliki cabang.',
      );
    }

    const distribution = await this.findOne(id, user);

    if (dto.returnedContainer > distribution.containerCount) {
      throw new BadRequestException(
        `Jumlah wadah kembali (${dto.returnedContainer}) tidak boleh melebihi jumlah dikirim (${distribution.containerCount}).`,
      );
    }

    let newStatus: DistributionStatus =
      DistributionStatus.WADAH_KEMBALI_SEBAGIAN;
    let returnedAt: Date | null = null;

    if (dto.returnedContainer === distribution.containerCount) {
      newStatus = DistributionStatus.SELESAI;
      returnedAt = new Date();
    } else if (dto.returnedContainer === 0) {
      newStatus = DistributionStatus.DIKIRIM;
    }

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.distribution.update({
        where: { id },
        data: {
          returnedContainer: dto.returnedContainer,
          status: newStatus,
          returnedAt: returnedAt,
        },
      });

      await tx.logActivity.create({
        data: {
          userId,
          action: 'DISTRIBUTION_RETURN_UPDATE',
          details: {
            distributionId: id,
            sent: distribution.containerCount,
            returned: dto.returnedContainer,
            status: newStatus,
          },
        },
      });

      return updated;
    });
  }
}
