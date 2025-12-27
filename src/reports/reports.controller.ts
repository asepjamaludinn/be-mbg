import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(Role.ADMIN_PUSAT, Role.ADMIN_CABANG)
  @ApiOperation({ summary: 'Dashboard Statistik' })
  @Get('dashboard')
  getDashboardSummary(@Request() req) {
    return this.reportsService.getDashboardSummary(req.user);
  }

  @Roles(Role.ADMIN_PUSAT, Role.ADMIN_CABANG)
  @ApiOperation({ summary: 'Laporan Penggunaan Bahan' })
  @Get('material-usage')
  getMaterialUsage(@Query() filter: ReportFilterDto, @Request() req) {
    return this.reportsService.getMaterialUsageReport(filter, req.user);
  }
}
