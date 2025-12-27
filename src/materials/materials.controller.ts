import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Request,
} from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Materials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Roles(Role.ADMIN_PUSAT)
  @Post()
  @ApiOperation({ summary: 'Tambah Material Baru' })
  create(@Body() createMaterialDto: CreateMaterialDto, @Request() req) {
    return this.materialsService.create(createMaterialDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List Material' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('active') active?: string,
    @Query('sortBy', new DefaultValuePipe('name'))
    sortBy?: 'name' | 'createdAt',
    @Query('sortOrder', new DefaultValuePipe('asc')) sortOrder?: 'asc' | 'desc',
  ) {
    const onlyActive = active === 'true';
    return this.materialsService.findAll(
      page,
      limit,
      search,
      onlyActive,
      sortBy,
      sortOrder,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail Material' })
  findOne(@Param('id') id: string) {
    return this.materialsService.findOne(id);
  }

  @Roles(Role.ADMIN_PUSAT)
  @Patch(':id')
  @ApiOperation({ summary: 'Update Material' })
  update(
    @Param('id') id: string,
    @Body() updateMaterialDto: UpdateMaterialDto,
    @Request() req,
  ) {
    return this.materialsService.update(id, updateMaterialDto, req.user.id);
  }

  @Roles(Role.ADMIN_PUSAT)
  @Delete(':id')
  @ApiOperation({ summary: 'Hapus Material' })
  remove(@Param('id') id: string, @Request() req) {
    return this.materialsService.remove(id, req.user.id);
  }
}
