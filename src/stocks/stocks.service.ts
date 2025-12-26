import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockOpnameDto } from './dto/stock-opname.dto';
import { StockFilterDto } from './dto/stock-filter.dto';
import { Prisma, Role } from '@prisma/client';

@Injectable()
export class StocksService {
  constructor(private prisma: PrismaService) {}

  async stockOpname(dto: StockOpnameDto, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: adminId } });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan.');
    }

    if (user.role === Role.ADMIN_CABANG && dto.branchId !== user.branchId) {
      throw new ForbiddenException(
        'Akses ditolak: Anda hanya boleh melakukan opname di cabang sendiri.',
      );
    }

    const [material, branch] = await Promise.all([
      this.prisma.material.findUnique({ where: { id: dto.materialId } }),
      this.prisma.branch.findUnique({ where: { id: dto.branchId } }),
    ]);

    if (!material) throw new NotFoundException('Material tidak ditemukan.');
    if (!branch) throw new NotFoundException('Cabang tidak ditemukan.');
    if (!material.isActive)
      throw new BadRequestException('Material sudah dinonaktifkan.');
    if (!branch.isActive)
      throw new BadRequestException('Cabang sudah dinonaktifkan.');

    const currentStock = await this.prisma.stock.findUnique({
      where: {
        materialId_branchId: {
          materialId: dto.materialId,
          branchId: dto.branchId,
        },
      },
    });

    if (!currentStock && user.role === Role.ADMIN_CABANG) {
      throw new BadRequestException(
        'Data stok belum tersedia di sistem. Admin Cabang tidak diizinkan membuat stok baru (harus via Distribusi dari Pusat).',
      );
    }

    const oldQty = currentStock ? currentStock.qty : 0;

    if (currentStock && oldQty === dto.qty) {
      return currentStock;
    }

    return await this.prisma.$transaction(async (tx) => {
      const stock = await tx.stock.upsert({
        where: {
          materialId_branchId: {
            materialId: dto.materialId,
            branchId: dto.branchId,
          },
        },
        update: { qty: dto.qty },
        create: {
          materialId: dto.materialId,
          branchId: dto.branchId,
          qty: dto.qty,
        },
        include: {
          material: { select: { name: true, unit: true } },
          branch: { select: { name: true } },
        },
      });

      const diff = dto.qty - oldQty;

      await tx.logActivity.create({
        data: {
          userId: adminId,
          action: 'STOCK_OPNAME',
          details: {
            branch: branch.name,
            material: material.name,
            reason: dto.reason || 'Manual Adjustment',
            changes: {
              from: oldQty,
              to: dto.qty,
              difference: diff,
              type: !currentStock ? 'INITIALIZATION' : 'ADJUSTMENT',
            },
          },
        },
      });

      return stock;
    });
  }

  async findAll(
    page: number,
    limit: number,
    filter: StockFilterDto,
    user: any,
  ) {
    const skip = (page - 1) * limit;
    const { branchId, search } = filter;

    const effectiveBranchId =
      user.role === Role.ADMIN_CABANG ? user.branchId : branchId;

    const whereClause: Prisma.StockWhereInput = {
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      ...(search
        ? {
            material: {
              name: { contains: search, mode: 'insensitive' },
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.stock.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          material: { select: { id: true, name: true, unit: true } },
          branch: { select: { id: true, name: true, isCenter: true } },
        },
        orderBy: [
          { branch: { isCenter: 'desc' } },
          { material: { name: 'asc' } },
        ],
      }),
      this.prisma.stock.count({ where: whereClause }),
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

  async findOne(id: string, user: any) {
    const stock = await this.prisma.stock.findUnique({
      where: { id },
      include: { material: true, branch: true },
    });

    if (!stock) throw new NotFoundException('Data stok tidak ditemukan');

    if (user.role === Role.ADMIN_CABANG && stock.branchId !== user.branchId) {
      throw new ForbiddenException(
        'Akses ditolak: Ini bukan stok cabang Anda.',
      );
    }

    return stock;
  }
}
