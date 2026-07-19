import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { fullName: 'asc' },
    });
  }
}
