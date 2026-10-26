import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;

  const mockUser = {
    id: 'user-uuid-1',
    institutionId: 'inst-uuid-1',
    fullName: 'Dr. Test Teacher',
    email: 'test.teacher@institution.edu',
    passwordHash: '',
    isActive: true,
    userRoles: [
      {
        role: { name: 'TEACHER' },
      },
    ],
    institution: {
      id: 'inst-uuid-1',
      name: 'Test Institution',
    },
    student: null as any,
  };

  beforeAll(async () => {
    mockUser.passwordHash = await argon2.hash('correct_password');
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      institution: {
        create: jest.fn(),
      },
      role: {
        findUnique: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    jwt = {
      sign: jest.fn().mockImplementation((payload, options) => {
        return `signed-token-${payload.sub}-${options?.expiresIn || 'default'}`;
      }),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should successfully authenticate with valid credentials', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.login({
        email: 'test.teacher@institution.edu',
        password: 'correct_password',
      });

      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test.teacher@institution.edu');
      expect(result.user.roles).toContain('TEACHER');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-uuid-1' },
        }),
      );
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@institution.edu',
          password: 'correct_password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.login({
          email: 'test.teacher@institution.edu',
          password: 'wrong_password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        service.login({
          email: 'test.teacher@institution.edu',
          password: 'correct_password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens when provided a valid refresh token', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-uuid-1' });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.refresh('valid-refresh-token');

      expect(result.tokens.accessToken).toBeDefined();
      expect(result.user.id).toBe('user-uuid-1');
    });

    it('should throw UnauthorizedException if refresh token verification fails', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.refresh('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user does not exist on refresh', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-uuid-1' });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh('valid-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('register', () => {
    it('should throw ConflictException if email is already taken', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test.teacher@institution.edu',
          password: 'password123',
          fullName: 'Test User',
          institutionName: 'Test School',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getProfile', () => {
    it('should return profile for valid user id', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const profile = await service.getProfile('user-uuid-1');
      expect(profile.id).toBe('user-uuid-1');
      expect(profile.email).toBe('test.teacher@institution.edu');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword (SEC-01 Regression)', () => {
    it('should reject changePassword when currentPassword is empty string', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mustChangePassword: false,
      });

      await expect(
        service.changePassword('user-uuid-1', {
          currentPassword: '',
          newPassword: 'newValidPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject changePassword when currentPassword is missing and mustChangePassword is false', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mustChangePassword: false,
      });

      await expect(
        service.changePassword('user-uuid-1', {
          newPassword: 'newValidPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject changePassword when currentPassword is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mustChangePassword: false,
      });

      await expect(
        service.changePassword('user-uuid-1', {
          currentPassword: 'wrong_password',
          newPassword: 'newValidPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should succeed when currentPassword is correct', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mustChangePassword: false,
      });
      prisma.user.update.mockResolvedValue({ id: 'user-uuid-1' });

      const result = await service.changePassword('user-uuid-1', {
        currentPassword: 'correct_password',
        newPassword: 'newValidPassword123!',
      });

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });
});
