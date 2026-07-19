import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.teacher.findMany({ include: { classes: true }, orderBy: { fullName: 'asc' } });
  }

  create(data: { fullName: string; phone?: string }) {
    return this.prisma.teacher.create({ data });
  }
}
