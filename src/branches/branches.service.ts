import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(createBranchDto: CreateBranchDto, adminId: string) {
    const existing = await this.prisma.branch.findFirst({
      where: { name: { equals: createBranchDto.name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException('Nama cabang sudah ada.');

    if (createBranchDto.isCenter) {
      const existingCenter = await this.prisma.branch.findFirst({
        where: { isCenter: true },
      });
      if (existingCenter) {
        throw new BadRequestException(
          'Gudang Pusat sudah ada. Tidak bisa membuat dua pusat.',
        );
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      const branch = await tx.branch.create({ data: createBranchDto });

      await tx.logActivity.create({
        data: {
          userId: adminId,
          action: 'CREATE_BRANCH',
          details: { name: branch.name, id: branch.id },
        },
      });
      return branch;
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    onlyActive: boolean = false,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.BranchWhereInput = {
      ...(onlyActive ? { isActive: true } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { isCenter: 'desc' },
      }),
      this.prisma.branch.count({ where }),
    ]);

    const lastPage = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage,
        hasNextPage: page < lastPage,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Cabang tidak ditemukan');
    return branch;
  }

  async update(id: string, dto: UpdateBranchDto, adminId: string) {
    const branch = await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.branch.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) throw new ConflictException('Nama cabang sudah digunakan.');
    }

    if (dto.isCenter) {
      const existingCenter = await this.prisma.branch.findFirst({
        where: { isCenter: true, id: { not: id } },
      });
      if (existingCenter) {
        throw new BadRequestException(
          'Sudah ada cabang pusat lain. Nonaktifkan status pusat pada cabang lama terlebih dahulu.',
        );
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.branch.update({
        where: { id },
        data: dto,
      });

      const { createdAt, updatedAt, ...cleanBranchData } = branch;

      await tx.logActivity.create({
        data: {
          userId: adminId,
          action: 'UPDATE_BRANCH',
          details: {
            id,
            updates: { ...dto },
            before: cleanBranchData,
          },
        },
      });
      return updated;
    });
  }

  async remove(id: string, adminId: string) {
    const branch = await this.findOne(id);

    const [userExists, stockRecordExists] = await Promise.all([
      this.prisma.user.findFirst({ where: { branchId: id } }),
      this.prisma.stock.findFirst({ where: { branchId: id } }),
    ]);

    if (userExists)
      throw new BadRequestException(
        'Gagal hapus: Masih ada pegawai yang terdaftar di cabang ini.',
      );

    if (stockRecordExists)
      throw new BadRequestException(
        'Gagal hapus: Cabang memiliki riwayat stok barang (meskipun kosong). Gunakan fitur Non-Aktifkan Cabang.',
      );

    return await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.branch.delete({ where: { id } });
      await tx.logActivity.create({
        data: {
          userId: adminId,
          action: 'DELETE_BRANCH',
          details: { name: branch.name, deletedId: id },
        },
      });
      return deleted;
    });
  }
}
