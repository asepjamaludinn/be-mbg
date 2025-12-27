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
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestFilterDto } from './dto/request-filter.dto';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { RejectRequestDto } from './dto/reject-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Roles(Role.ADMIN_CABANG)
  @Post()
  @ApiOperation({
    summary: 'Buat Request Baru',
    description: 'Hanya untuk Admin Cabang',
  })
  @ApiResponse({ status: 201, description: 'Request berhasil dibuat.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() createDto: CreateRequestDto, @Request() req) {
    return this.requestsService.create(createDto, req.user.id);
  }

  @Roles(Role.ADMIN_PUSAT, Role.ADMIN_CABANG)
  @Get()
  @ApiOperation({
    summary: 'Ambil Semua Request',
    description: 'Bisa difilter by status, date, branch',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query() filter: RequestFilterDto,
    @Request() req,
  ) {
    return this.requestsService.findAll(page, limit, filter, req.user);
  }

  @Roles(Role.ADMIN_PUSAT, Role.ADMIN_CABANG)
  @Get(':id')
  @ApiOperation({ summary: 'Detail Request' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.requestsService.findOne(id, req.user);
  }

  @Roles(Role.ADMIN_PUSAT)
  @Patch(':id/approve')
  @ApiOperation({
    summary: 'Approve Request (Pusat)',
    description: 'Setujui jumlah barang',
  })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveRequestDto,
    @Request() req,
  ) {
    return this.requestsService.approve(id, dto, req.user.id);
  }

  @Roles(Role.ADMIN_PUSAT)
  @Patch(':id/ship')
  @ApiOperation({
    summary: 'Kirim Barang (Ship)',
    description: 'Mengurangi stok pusat',
  })
  ship(@Param('id') id: string, @Request() req) {
    return this.requestsService.ship(id, req.user.id);
  }

  @Roles(Role.ADMIN_PUSAT)
  @Patch(':id/reject')
  @ApiOperation({
    summary: 'Tolak Request',
    description: 'Wajib menyertakan alasan',
  })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectRequestDto,
    @Request() req,
  ) {
    return this.requestsService.reject(id, dto, req.user.id);
  }

  @Roles(Role.ADMIN_CABANG)
  @Patch(':id/receive')
  @ApiOperation({
    summary: 'Terima Barang (Receive)',
    description: 'Menambah stok cabang',
  })
  receive(@Param('id') id: string, @Request() req) {
    return this.requestsService.receive(id, req.user.id);
  }
}
