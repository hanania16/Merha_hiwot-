import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';

@Injectable()
export class ReceiptsService {
  constructor(private prisma: PrismaService) {}

  private async nextReceiptNumber(): Promise<string> {
    const count = await this.prisma.receipt.count();
    const year = new Date().getFullYear();
    return `MH-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  async create(dto: CreateReceiptDto, userId: string) {
    const receiptNumber = await this.nextReceiptNumber();
    return this.prisma.receipt.create({
      data: {
        receiptNumber,
        studentId: dto.studentId,
        monthsPaid: dto.monthsPaid,
        amount: dto.amount,
        issuedById: userId,
      },
      include: { student: true, issuedBy: { select: { fullName: true } } },
    });
  }

  findAll(studentId?: string) {
    return this.prisma.receipt.findMany({
      where: { studentId },
      include: { student: true, issuedBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.receipt.findUnique({
      where: { id },
      include: { student: { include: { class: true } }, issuedBy: { select: { fullName: true } } },
    });
  }
}
