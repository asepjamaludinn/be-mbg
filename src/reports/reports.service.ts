import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { RequestStatus, Role, Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary(user: any) {
    const branchFilter =
      user.role === Role.ADMIN_CABANG ? { branchId: user.branchId } : {};

    const [totalRequests, pendingRequests, totalBranches, totalMaterials] =
      await Promise.all([
        this.prisma.request.count({ where: branchFilter }),

        this.prisma.request.count({
          where: { ...branchFilter, status: RequestStatus.PENDING },
        }),

        user.role === Role.ADMIN_PUSAT
          ? this.prisma.branch.count({ where: { isActive: true } })
          : 1,

        this.prisma.material.count({ where: { isActive: true } }),
      ]);

    return {
      totalRequests,
      pendingRequests,
      totalBranches,
      totalMaterials,
    };
  }

  async getMaterialUsageReport(filter: ReportFilterDto, user: any) {
    const { startDate, endDate, branchId } = filter;

    const effectiveBranchId =
      user.role === Role.ADMIN_CABANG ? user.branchId : branchId;

    let dateFilter: Prisma.RequestWhereInput = {};

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);

      const end = endDate ? new Date(endDate) : new Date();

      end.setHours(23, 59, 59, 999);

      dateFilter = {
        requestDate: {
          gte: start,
          lte: end,
        },
      };
    }

    const requestWhere: Prisma.RequestWhereInput = {
      status: { in: [RequestStatus.SHIPPED, RequestStatus.RECEIVED] },
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      ...dateFilter,
    };

    const usage = await this.prisma.requestItem.groupBy({
      by: ['materialId'],
      _sum: {
        qtyApproved: true,
      },
      where: {
        request: requestWhere,
      },
    });

    const materialIds = usage.map((u) => u.materialId);
    const materials = await this.prisma.material.findMany({
      where: { id: { in: materialIds } },
      select: { id: true, name: true, unit: true },
    });

    const report = usage.map((u) => {
      const mat = materials.find((m) => m.id === u.materialId);
      return {
        materialId: u.materialId,
        materialName: mat?.name || 'Unknown',
        unit: mat?.unit || '-',
        totalQty: u._sum.qtyApproved || 0,
      };
    });

    return report.sort((a, b) => b.totalQty - a.totalQty);
  }
}
