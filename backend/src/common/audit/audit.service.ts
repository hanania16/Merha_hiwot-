import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    userId?: string;
    changedBy?: string;
    action: string;
    entityType: string;
    entityId: string;
    reason?: string;
    oldValue?: unknown;
    newValue?: unknown;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        changedById: params.changedBy,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        reason: params.reason,
        oldValue: params.oldValue as any,
        newValue: params.newValue as any,
      },
    });
  }

  findAll(params: { entityType?: string; from?: Date; to?: Date; take?: number; skip?: number }) {
    return this.prisma.auditLog.findMany({
      where: {
        entityType: params.entityType,
        createdAt: { gte: params.from, lte: params.to },
      },
      include: { user: { select: { fullName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 50,
      skip: params.skip ?? 0,
    });
  }
}
