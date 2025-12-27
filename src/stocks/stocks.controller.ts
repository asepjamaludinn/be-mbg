import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
  Param,
} from '@nestjs/common';
import { StocksService } from './stocks.service';
import { StockOpnameDto } from './dto/stock-opname.dto';
import { StockFilterDto } from './dto/stock-filter.dto';
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

@ApiTags('Stocks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Roles(Role.ADMIN_PUSAT)
  @Post('opname')
  @ApiOperation({ summary: 'Stock Opname (Create/Update Stock Manual)' })
  opname(@Body() dto: StockOpnameDto, @Request() req) {
    return this.stocksService.stockOpname(dto, req.user.id);
  }

  @Roles(Role.ADMIN_PUSAT, Role.ADMIN_CABANG)
  @Get()
  @ApiOperation({ summary: 'List Stok' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query() filter: StockFilterDto,
    @Request() req,
  ) {
    return this.stocksService.findAll(page, limit, filter, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail Stok' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.stocksService.findOne(id, req.user);
  }
}
