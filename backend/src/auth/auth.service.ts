import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(dto: LoginDto) {
    console.log('=== AUTH LOGIN START ===');
    console.log('dto.email received:', dto.email);
    console.log('dto.password received:', dto.password);
    console.log('Prisma where object:', JSON.stringify({ where: { email: dto.email } }));
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    console.log('prisma findUnique result:', user ? 'FOUND: ' + user.email + ' isActive=' + user.isActive : 'NULL');
    if (!user || !user.isActive) {
      console.log('Unauthorized: no active user found for email', dto.email);
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    console.log('bcrypt.compare result:', passwordMatches, 'for password:', dto.password, 'against hash starting:', user.passwordHash.substring(0, 16) + '...');
    if (!passwordMatches) {
      console.log('Unauthorized: password does not match for user', user.email);
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, role: true, isActive: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}