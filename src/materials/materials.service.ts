import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  async create(createMaterialDto: CreateMaterialDto, adminId: string) {
    const existing = await this.prisma.material.findFirst({
      where: { name: { equals: createMaterialDto.name, mode: 'insensitive' } },
    });

    if (existing) {
      throw new ConflictException(
        `Material dengan nama "${createMaterialDto.name}" sudah ada.`,
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const material = await tx.material.create({
          data: createMaterialDto,
        });

        await tx.logActivity.create({
          data: {
            userId: adminId,
            action: 'CREATE_MATERIAL',
            details: { materialId: material.id, name: material.name },
          },
        });

        return material;
      });
    } catch (error) {
      throw error;
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    onlyActive: boolean = false,
    sortBy: string = 'name',
    sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    const skip = (page - 1) * limit;

    const allowedSortFields = ['name', 'createdAt', 'unit', 'isActive'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'name';

    const whereClause: Prisma.MaterialWhereInput = {
      ...(onlyActive ? { isActive: true } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.material.findMany({
        where: whereClause,
        skip,
        take: limit,

        orderBy: {
          [safeSortBy as keyof Prisma.MaterialOrderByWithRelationInput]:
            sortOrder,
        },
      }),
      this.prisma.material.count({ where: whereClause }),
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
        sortBy: safeSortBy,
        sortOrder,
      },
    };
  }

  async findOne(id: string) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('Material tidak ditemukan');
    return material;
  }

  async update(
    id: string,
    updateMaterialDto: UpdateMaterialDto,
    adminId: string,
  ) {
    const material = await this.findOne(id);

    if (updateMaterialDto.name) {
      const existing = await this.prisma.material.findFirst({
        where: {
          name: { equals: updateMaterialDto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Nama material "${updateMaterialDto.name}" sudah digunakan oleh material lain.`,
        );
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.material.update({
        where: { id },
        data: updateMaterialDto,
      });

      await tx.logActivity.create({
        data: {
          userId: adminId,
          action: 'UPDATE_MATERIAL',
          details: {
            materialId: id,
            before: {
              name: material.name,
              unit: material.unit,
              active: material.isActive,
            },

            after: { ...updateMaterialDto },
          },
        },
      });

      return updated;
    });
  }

  async remove(id: string, adminId: string) {
    const material = await this.findOne(id);

    const stockExists = await this.prisma.stock.findFirst({
      where: { materialId: id },
    });

    const requestExists = await this.prisma.requestItem.findFirst({
      where: { materialId: id },
    });

    if (stockExists || requestExists) {
      throw new ConflictException(
        'Material tidak bisa dihapus permanen karena memiliki riwayat stok atau permintaan. Gunakan fitur "Update" untuk menonaktifkan material ini.',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.material.delete({ where: { id } });

      await tx.logActivity.create({
        data: {
          userId: adminId,
          action: 'DELETE_MATERIAL',
          details: { name: material.name },
        },
      });

      return deleted;
    });
  }
}
