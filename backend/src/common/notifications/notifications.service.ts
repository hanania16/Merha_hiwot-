import { Injectable } from '@nestjs/common';
import { NotificationType, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Which notification types each role sees in the bell dropdown. Administrators see everything. */
const ROLE_VISIBILITY: Record<Role, NotificationType[] | null> = {
  ADMINISTRATOR: null, // null = all types
  FINANCE_OFFICER: ['UNPAID_FEES', 'LARGE_EXPENSE', 'REPORT_READY', 'MISSING_PAYMENT_RECORD', 'WEEKLY_DIGEST'],
};

@Injectable()
export class GlobalNotificationsService {
  constructor(private prisma: PrismaService) {}

  async findForRole(role: Role, unreadOnly = false) {
    const types = ROLE_VISIBILITY[role];
    return this.prisma.notification.findMany({
      where: { type: types ? { in: types } : undefined, isRead: unreadOnly ? false : undefined },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async unreadCount(role: Role) {
    const types = ROLE_VISIBILITY[role];
    return this.prisma.notification.count({
      where: { type: types ? { in: types } : undefined, isRead: false },
    });
  }

  markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  markAllRead(role: Role) {
    const types = ROLE_VISIBILITY[role];
    return this.prisma.notification.updateMany({
      where: { type: types ? { in: types } : undefined, isRead: false },
      data: { isRead: true },
    });
  }
}
