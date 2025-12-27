import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { DistributionsService } from './distributions.service';
import { CreateDistributionDto } from './dto/create-distribution.dto';
import { UpdateDistributionStatusDto } from './dto/update-distribution-status.dto';
import { DistributionFilterDto } from './dto/distribution-filter.dto';
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

@ApiTags('Distributions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('distributions')
export class DistributionsController {
  constructor(private readonly distributionsService: DistributionsService) {}

  @Roles(Role.ADMIN_CABANG)
  @Post()
  @ApiOperation({
    summary: 'Kirim Makanan ke Sekolah',
    description: 'Input jumlah wadah yang dikirim',
  })
  create(@Body() createDto: CreateDistributionDto, @Request() req) {
    return this.distributionsService.create(createDto, req.user.id);
  }

  @Roles(Role.ADMIN_PUSAT, Role.ADMIN_CABANG)
  @Get()
  @ApiOperation({
    summary: 'List Distribusi',
    description: 'Filter by sekolah, tanggal, status',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query() filter: DistributionFilterDto,
    @Request() req,
  ) {
    return this.distributionsService.findAll(page, limit, filter, req.user);
  }

  @Roles(Role.ADMIN_PUSAT, Role.ADMIN_CABANG)
  @Get(':id')
  @ApiOperation({
    summary: 'Detail Distribusi',
    description: 'Melihat detail pengiriman makanan berdasarkan ID',
  })
  findOne(@Param('id') id: string, @Request() req) {
    return this.distributionsService.findOne(id, req.user);
  }

  @Roles(Role.ADMIN_CABANG)
  @Patch(':id/return-containers')
  @ApiOperation({
    summary: 'Update Pengembalian Wadah',
    description: 'Update jumlah wadah yang kembali dari sekolah',
  })
  updateReturn(
    @Param('id') id: string,
    @Body() dto: UpdateDistributionStatusDto,
    @Request() req,
  ) {
    return this.distributionsService.updateReturnStatus(id, dto, req.user.id);
  }
}
