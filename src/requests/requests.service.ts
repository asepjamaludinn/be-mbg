import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestFilterDto } from './dto/request-filter.dto';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { Prisma, RequestStatus, Role } from '@prisma/client';
import { RejectRequestDto } from './dto/reject-request.dto';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class RequestsService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
  ) {}

  private async notifyBranchAdmins(
    branchId: string,
    subject: string,
    message: string,
  ) {
    try {
      const admins = await this.prisma.user.findMany({
        where: {
          branchId: branchId,
          role: Role.ADMIN_CABANG,
          isActive: true,
        },
      });

      if (admins.length === 0) return;

      await Promise.all(
        admins.map((admin) =>
          this.mailerService.sendMail({
            to: admin.email,
            subject: `[Dapur MBG] ${subject}`,
            html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; max-width: 600px;">
              <h3>Halo ${admin.name},</h3>
              <p>${message}</p>
              <br/>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"/>
              <p style="font-size: 12px; color: #888;">Silakan login ke aplikasi untuk melihat detail selengkapnya.</p>
            </div>
          `,
          }),
        ),
      );
    } catch (error) {
      console.error('Gagal mengirim notifikasi email:', error);
    }
  }

  async create(dto: CreateRequestDto, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { branch: true },
    });

    if (!user) throw new NotFoundException('User tidak ditemukan.');
    if (user.role !== Role.ADMIN_CABANG) {
      throw new ForbiddenException(
        'Hanya Admin Cabang yang boleh membuat request.',
      );
    }

    if (!user.branch || !user.branch.isActive) {
      throw new BadRequestException(
        'Cabang user tidak valid atau tidak aktif.',
      );
    }

    if (!user.branchId) {
      throw new BadRequestException('User tidak terikat dengan branchId.');
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.request.count();
    const code = `REQ-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

    return await this.prisma.request.create({
      data: {
        code,
        branchId: user.branchId,
        notes: dto.notes,
        status: RequestStatus.PENDING,
        items: {
          create: dto.items.map((item) => ({
            materialId: item.materialId,
            qty: item.qty,
          })),
        },
      },
      include: { items: true },
    });
  }

  async findAll(
    page: number,
    limit: number,
    filter: RequestFilterDto,
    user: any,
  ) {
    const skip = (page - 1) * limit;
    const { status, startDate, endDate, branchId } = filter;

    const effectiveBranchId =
      user.role === Role.ADMIN_CABANG ? user.branchId : branchId;

    const where: Prisma.RequestWhereInput = {
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      ...(status ? { status } : {}),
      ...(startDate && endDate
        ? {
            requestDate: {
              gte: new Date(startDate),
              lte: new Date(new Date(endDate).setHours(23, 59, 59)),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.request.findMany({
        where,
        skip,
        take: limit,
        include: {
          branch: { select: { name: true } },
          items: {
            include: { material: { select: { name: true, unit: true } } },
          },
          processedBy: { select: { name: true } },
        },
        orderBy: { requestDate: 'desc' },
      }),
      this.prisma.request.count({ where }),
    ]);

    const lastPage = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage,
        hasNextPage: page < lastPage,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(id: string, user: any) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        items: { include: { material: true } },
        branch: true,
        processedBy: true,
      },
    });

    if (!request) throw new NotFoundException('Request tidak ditemukan');

    if (
      user &&
      user.role === Role.ADMIN_CABANG &&
      request.branchId !== user.branchId
    ) {
      throw new ForbiddenException(
        'Akses ditolak: Ini bukan request cabang Anda.',
      );
    }

    return request;
  }

  async approve(id: string, dto: ApproveRequestDto, adminId: string) {
    const request = await this.prisma.request.findUnique({ where: { id } });

    if (!request) throw new NotFoundException('Request tidak ditemukan');
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(
        `Hanya request PENDING yang bisa diapprove. Status saat ini: ${request.status}`,
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      for (const itemDto of dto.items) {
        await tx.requestItem.update({
          where: { id: itemDto.itemId },
          data: { qtyApproved: itemDto.qtyApproved },
        });
      }

      const updated = await tx.request.update({
        where: { id },
        data: {
          status: RequestStatus.APPROVED,
          processedById: adminId,
          processedAt: new Date(),
        },
      });

      await tx.logActivity.create({
        data: {
          userId: adminId,
          action: 'APPROVE_REQUEST',
          details: { requestId: id, code: request.code },
        },
      });

      this.notifyBranchAdmins(
        request.branchId,
        'Permintaan Disetujui',
        `Permintaan Anda dengan kode <b>${request.code}</b> telah <b>DISETUJUI</b> oleh Pusat. Mohon tunggu proses pengiriman barang.`,
      );

      return updated;
    });
  }

  async ship(id: string, adminId: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: { items: { include: { material: true } } },
    });

    if (!request) throw new NotFoundException('Request tidak ditemukan');
    if (request.status !== RequestStatus.APPROVED) {
      throw new BadRequestException(
        'Hanya request berstatus APPROVED yang bisa dikirim.',
      );
    }

    const centerBranch = await this.prisma.branch.findFirst({
      where: { isCenter: true },
    });
    if (!centerBranch)
      throw new BadRequestException('Gudang Pusat tidak ditemukan!');

    return await this.prisma.$transaction(async (tx) => {
      for (const item of request.items) {
        const qtyToSend = item.qtyApproved ?? item.qty;

        const centerStock = await tx.stock.findUnique({
          where: {
            materialId_branchId: {
              materialId: item.materialId,
              branchId: centerBranch.id,
            },
          },
        });

        if (!centerStock || centerStock.qty < qtyToSend) {
          throw new BadRequestException(
            `Stok Pusat tidak cukup untuk material: ${item.material.name}. Stok tersedia: ${centerStock?.qty || 0}`,
          );
        }

        await tx.stock.update({
          where: { id: centerStock.id },
          data: { qty: { decrement: qtyToSend } },
        });
      }

      const updated = await tx.request.update({
        where: { id },
        data: { status: RequestStatus.SHIPPED },
      });

      await tx.logActivity.create({
        data: {
          userId: adminId,
          action: 'SHIP_REQUEST',
          details: {
            requestId: id,
            code: request.code,
            summary: request.items.map((item) => ({
              material: item.material.name,
              qty: item.qtyApproved ?? item.qty,
              unit: item.material.unit,
            })),
          },
        },
      });

      this.notifyBranchAdmins(
        request.branchId,
        'Barang Sedang Dikirim',
        `Permintaan Anda dengan kode <b>${request.code}</b> sekarang berstatus <b>DIKIRIM (SHIPPED)</b>. Mohon lakukan konfirmasi penerimaan di aplikasi saat barang tiba di lokasi.`,
      );

      return updated;
    });
  }

  async receive(id: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: { items: { include: { material: true } } },
    });

    if (!user) throw new NotFoundException('User tidak ditemukan');
    if (!request) throw new NotFoundException('Request tidak ditemukan');

    if (user.role === Role.ADMIN_CABANG && request.branchId !== user.branchId) {
      throw new ForbiddenException(
        'Anda tidak berhak menerima request cabang lain.',
      );
    }

    if (request.status !== RequestStatus.SHIPPED) {
      throw new BadRequestException(
        'Hanya request berstatus SHIPPED yang bisa diterima.',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      for (const item of request.items) {
        const qtyReceived = item.qtyApproved ?? item.qty;

        await tx.stock.upsert({
          where: {
            materialId_branchId: {
              materialId: item.materialId,
              branchId: request.branchId,
            },
          },
          update: { qty: { increment: qtyReceived } },
          create: {
            materialId: item.materialId,
            branchId: request.branchId,
            qty: qtyReceived,
          },
        });
      }

      const updated = await tx.request.update({
        where: { id },
        data: { status: RequestStatus.RECEIVED },
      });

      await tx.logActivity.create({
        data: {
          userId: userId,
          action: 'RECEIVE_REQUEST',
          details: {
            requestId: id,
            code: request.code,
            receivedItems: request.items.map((item) => ({
              material: item.material.name,
              qty: item.qtyApproved ?? item.qty,
              unit: item.material.unit,
            })),
          },
        },
      });

      return updated;
    });
  }

  async reject(id: string, dto: RejectRequestDto, adminId: string) {
    const request = await this.prisma.request.findUnique({ where: { id } });

    if (!request) throw new NotFoundException('Request tidak ditemukan');
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Hanya request PENDING yang bisa ditolak.');
    }

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.request.update({
        where: { id },
        data: {
          status: RequestStatus.REJECTED,
          processedById: adminId,
          processedAt: new Date(),
          notes: request.notes
            ? `${request.notes} | REJECTED REASON: ${dto.reason}`
            : `REJECTED REASON: ${dto.reason}`,
        },
      });

      await tx.logActivity.create({
        data: {
          userId: adminId,
          action: 'REJECT_REQUEST',
          details: {
            requestId: id,
            code: request.code,
            reason: dto.reason,
          },
        },
      });

      this.notifyBranchAdmins(
        request.branchId,
        'Permintaan Ditolak',
        `Permintaan Anda dengan kode <b>${request.code}</b> telah <b>DITOLAK</b> oleh Pusat.<br/><br/><b>Alasan:</b> ${dto.reason}`,
      );

      return updated;
    });
  }
}
