import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(role?: Role) {
    return this.prisma.user.findMany({
      where: role ? { role } : undefined,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        signatureUrl: true,
        titleAmharic: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        coursesTeaching: {
          select: {
            id: true,
            code: true,
            name: true,
            nameAmharic: true,
            targetGrade: true,
            scheduleTime: true,
            classLevel: true,
          },
        },
        _count: {
          select: {
            coursesTeaching: true,
            submittedGrades: true,
            sentMessages: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        signatureUrl: true,
        titleAmharic: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        coursesTeaching: {
          select: {
            id: true,
            code: true,
            name: true,
            nameAmharic: true,
            targetGrade: true,
            scheduleTime: true,
            classLevel: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(data: {
    fullName: string;
    email: string;
    password?: string;
    role: Role;
    isActive?: boolean;
    signatureUrl?: string;
    titleAmharic?: string;
    phone?: string;
  }) {
    const normalizedEmail = data.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }
    const passwordHash = await bcrypt.hash(data.password || 'Password123!', 10);
    return this.prisma.user.create({
      data: {
        fullName: data.fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        role: data.role,
        isActive: data.isActive ?? true,
        signatureUrl: data.signatureUrl || null,
        titleAmharic: data.titleAmharic?.trim() || null,
        phone: data.phone?.trim() || null,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        signatureUrl: true,
        titleAmharic: true,
        phone: true,
        createdAt: true,
      },
    });
  }

  async update(
    id: string,
    data: {
      fullName?: string;
      email?: string;
      role?: Role;
      isActive?: boolean;
      password?: string;
      signatureUrl?: string | null;
      titleAmharic?: string | null;
      phone?: string | null;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updateData: any = {};
    if (data.fullName !== undefined) updateData.fullName = data.fullName.trim();
    if (data.email !== undefined) {
      const normalizedEmail = data.email.toLowerCase().trim();
      if (normalizedEmail !== user.email) {
        const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existing) throw new ConflictException('A user with this email already exists');
        updateData.email = normalizedEmail;
      }
    }
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.signatureUrl !== undefined) updateData.signatureUrl = data.signatureUrl;
    if (data.titleAmharic !== undefined) updateData.titleAmharic = data.titleAmharic?.trim() || null;
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.password && data.password.trim().length > 0) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        signatureUrl: true,
        titleAmharic: true,
        phone: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: string) {
    try {
      return await this.prisma.user.delete({ where: { id } });
    } catch {
      return await this.prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
    }
  }
}
