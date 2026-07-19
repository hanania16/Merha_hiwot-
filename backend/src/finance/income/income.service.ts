import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { QueryIncomeDto } from './dto/query-income.dto';

@Injectable()
export class IncomeService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  findAll(query: QueryIncomeDto) {
    return this.prisma.income.findMany({
      where: {
        category: query.category,
        date: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
      include: { recordedBy: { select: { fullName: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async create(dto: CreateIncomeDto, userId: string) {
    const income = await this.prisma.income.create({
      data: { ...dto, date: new Date(dto.date), recordedById: userId },
    });
    await this.audit.log({
      userId,
      action: 'INCOME_RECORDED',
      entityType: 'Income',
      entityId: income.id,
      newValue: income,
    });
    return income;
  }

  async update(id: string, dto: Partial<CreateIncomeDto>, userId: string) {
    const existing = await this.prisma.income.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Income record not found');

    const updated = await this.prisma.income.update({
      where: { id },
      data: { ...dto, date: dto.date ? new Date(dto.date) : undefined },
    });
    await this.audit.log({
      userId,
      action: 'INCOME_UPDATED',
      entityType: 'Income',
      entityId: id,
      oldValue: existing,
      newValue: updated,
    });
    return updated;
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.income.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Income record not found');
    await this.prisma.income.delete({ where: { id } });
    await this.audit.log({
      userId,
      action: 'INCOME_DELETED',
      entityType: 'Income',
      entityId: id,
      oldValue: existing,
    });
    return { success: true };
  }
}
