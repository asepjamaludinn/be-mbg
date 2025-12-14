import { Injectable } from '@nestjs/common';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { PrismaService } from 'src/prisma/prisma.service';

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

  findOne(id: number) {
    return this.prisma.material.findUnique({ where: { id } });
  }

  update(id: number, updateMaterialDto: UpdateMaterialDto) {
    return this.prisma.material.update({
      where: { id },
      data: updateMaterialDto,
    });
  }

  remove(id: number) {
    return this.prisma.material.delete({ where: { id } });
  }
}
