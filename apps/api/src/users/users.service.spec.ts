import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoleName } from '../_shared/enums/roles';

describe('UsersService (SEC-04 Regression)', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn().mockResolvedValue({ id: 'new-user-id', email: 'test@example.com' }),
        findUnique: jest.fn(),
      },
      role: {
        upsert: jest.fn().mockResolvedValue({ id: 'role-superadmin', name: 'SUPER_ADMIN' }),
      },
      userRole: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should REJECT an INSTITUTION_ADMIN attempting to create a SUPER_ADMIN account', async () => {
    const caller: any = {
      id: 'inst-admin-id',
      roles: [RoleName.INSTITUTION_ADMIN],
      institutionId: 'inst-1',
    };

    await expect(
      service.create(
        {
          email: 'escalated@example.com',
          fullName: 'Attacker Escalated',
          password: 'Password123!',
          role: 'SUPER_ADMIN',
          institutionId: 'inst-1',
        },
        caller,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should REJECT an INSTITUTION_ADMIN attempting to create a user in another institution', async () => {
    const caller: any = {
      id: 'inst-admin-id',
      roles: [RoleName.INSTITUTION_ADMIN],
      institutionId: 'inst-1',
    };

    await expect(
      service.create(
        {
          email: 'target@example.com',
          fullName: 'Target User',
          password: 'Password123!',
          role: 'TEACHER',
          institutionId: 'inst-2', // different institution
        },
        caller,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should ALLOW a SUPER_ADMIN caller to create a SUPER_ADMIN account', async () => {
    const caller: any = {
      id: 'super-admin-id',
      roles: [RoleName.SUPER_ADMIN],
    };

    const result = await service.create(
      {
        institutionId: 'inst-1',
        email: 'newadmin@example.com',
        fullName: 'New Super Admin',
        password: 'Password123!',
        role: 'SUPER_ADMIN',
      },
      caller,
    );

    expect(result).toBeDefined();
    expect(prisma.user.create).toHaveBeenCalled();
  });
});
