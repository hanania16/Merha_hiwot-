import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageCategory } from '@prisma/client';

export interface CreateMessageDto {
  title: string;
  content: string;
  category?: MessageCategory;
  targetAudience?: string;
  isPinned?: boolean;
}

@Injectable()
export class CommunicationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { category?: MessageCategory; target?: string }) {
    const where: any = {};
    if (query?.category) {
      where.category = query.category;
    }
    if (query?.target && query.target !== 'ALL') {
      where.targetAudience = { in: ['ALL', query.target] };
    }

    return this.prisma.departmentMessage.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(dto: CreateMessageDto, senderId: string) {
    return this.prisma.departmentMessage.create({
      data: {
        senderId,
        title: dto.title.trim(),
        content: dto.content.trim(),
        category: dto.category ?? MessageCategory.GENERAL,
        targetAudience: dto.targetAudience || 'ALL',
        isPinned: dto.isPinned ?? false,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });
  }

  async togglePin(id: string) {
    const msg = await this.prisma.departmentMessage.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');

    return this.prisma.departmentMessage.update({
      where: { id },
      data: { isPinned: !msg.isPinned },
    });
  }

  async remove(id: string) {
    const msg = await this.prisma.departmentMessage.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');

    return this.prisma.departmentMessage.delete({ where: { id } });
  }
}
