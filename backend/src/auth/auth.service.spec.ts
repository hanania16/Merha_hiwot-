import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock } };
  let jwt: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-1',
    email: 'admin@marha.com',
    passwordHash: '$2b$10$hashedpassword',
    fullName: 'Admin User',
    role: 'admin',
    isActive: true,
  };

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwt = module.get(JwtService) as jest.Mocked<JwtService>;
  });

  describe('login', () => {
    it('should return an access token on valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwt.signAsync.mockResolvedValue('token-123');

      const result = await service.login({ email: 'admin@marha.com', password: 'secret' });

      expect(result.accessToken).toBe('token-123');
      expect(result.user.email).toBe('admin@marha.com');
    });

    it('should throw on invalid email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@email.com', password: 'secret' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on inactive user', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(
        service.login({ email: 'admin@marha.com', password: 'secret' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'admin@marha.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('me', () => {
    it('should return user profile', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        fullName: 'Admin User',
        email: 'admin@marha.com',
        role: 'admin',
        isActive: true,
      });

      const result = await service.me('user-1');

      expect(result.email).toBe('admin@marha.com');
    });

    it('should throw if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.me('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });
});
