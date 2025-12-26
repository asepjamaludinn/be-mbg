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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { RejectRequestDto } from './dto/reject-request.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Roles(Role.ADMIN_CABANG)
  @Post()
  create(@Body() createDto: CreateRequestDto, @Request() req) {
    return this.requestsService.create(createDto, req.user.id);
  }

  @Roles(Role.ADMIN_PUSAT, Role.ADMIN_CABANG)
  @Get()
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
  findOne(@Param('id') id: string, @Request() req) {
    return this.requestsService.findOne(id, req.user);
  }

  @Roles(Role.ADMIN_PUSAT)
  @Patch(':id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveRequestDto,
    @Request() req,
  ) {
    return this.requestsService.approve(id, dto, req.user.id);
  }

  @Roles(Role.ADMIN_PUSAT)
  @Patch(':id/ship')
  ship(@Param('id') id: string, @Request() req) {
    return this.requestsService.ship(id, req.user.id);
  }

  @Roles(Role.ADMIN_PUSAT)
  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectRequestDto,
    @Request() req,
  ) {
    return this.requestsService.reject(id, dto, req.user.id);
  }

  @Roles(Role.ADMIN_CABANG)
  @Patch(':id/receive')
  receive(@Param('id') id: string, @Request() req) {
    return this.requestsService.receive(id, req.user.id);
  }
}
