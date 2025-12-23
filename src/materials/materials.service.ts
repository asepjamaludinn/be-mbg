import { Injectable } from '@nestjs/common';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  create(createMaterialDto: CreateMaterialDto) {
    return this.prisma.material.create({
      data: createMaterialDto,
    });
  }

  findAll() {
    return this.prisma.material.findMany();
  }

  findOne(id: string) {
    return this.prisma.material.findUnique({ where: { id } });
  }

  update(id: string, updateMaterialDto: UpdateMaterialDto) {
    return this.prisma.material.update({
      where: { id },
      data: updateMaterialDto,
    });
  }

  remove(id: string) {
    return this.prisma.material.delete({ where: { id } });
  }
}
