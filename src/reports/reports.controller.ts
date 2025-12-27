import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(Role.ADMIN_PUSAT, Role.ADMIN_CABANG)
  @Get('dashboard')
  getDashboardSummary(@Request() req) {
    return this.reportsService.getDashboardSummary(req.user);
  }

  @Roles(Role.ADMIN_PUSAT, Role.ADMIN_CABANG)
  @Get('material-usage')
  getMaterialUsage(@Query() filter: ReportFilterDto, @Request() req) {
    return this.reportsService.getMaterialUsageReport(filter, req.user);
  }
}
