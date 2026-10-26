import { Test, TestingModule } from '@nestjs/testing';
import { StudentsService } from './students.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { RoleName } from '../_shared/enums/roles';
import type { JwtPayload } from '../_shared/types/jwt';

describe('StudentsService', () => {
  let service: StudentsService;
  let prisma: any;

  const mockInstitutionId = 'inst-vemana-01';
  const mockOtherInstitutionId = 'inst-other-02';

  const mockStudent = {
    id: 'cuid-stu-101',
    institutionId: mockInstitutionId,
    studentId: '1VI23CS058',
    usn: '1VI23CS058',
    rollNumber: '23CS058',
    fullName: 'Rahul Sharma',
    email: 'rahul@vemanait.edu.in',
    userId: 'user-stu-1',
    attendancePercentage: 88.5,
    engagementScore: 92,
    faceEnrolled: true,
  };

  const mockTeacherUser: JwtPayload = {
    id: 'user-teacher-1',
    sub: 'user-teacher-1',
    email: 'teacher@vemanait.edu.in',
    institutionId: mockInstitutionId,
    roles: [RoleName.TEACHER],
  };

  const mockCrossTenantUser: JwtPayload = {
    id: 'user-other-1',
    sub: 'user-other-1',
    email: 'other@other.edu.in',
    institutionId: mockOtherInstitutionId,
    roles: [RoleName.TEACHER],
  };

  beforeEach(async () => {
    prisma = {
      student: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 5 }),
        delete: jest.fn(),
      },
      clusterAssignment: { deleteMany: jest.fn().mockResolvedValue({ count: 5 }) },
      studentCluster: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 5 }),
      },
      faceEmbedding: { deleteMany: jest.fn().mockResolvedValue({ count: 5 }) },
      faceImage: { deleteMany: jest.fn().mockResolvedValue({ count: 5 }) },
      enrollmentSession: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
  });

  describe('Tenant isolation and student resolution', () => {
    it('1. Scopes findAll to caller institution for non-superadmin users', async () => {
      prisma.student.findMany.mockResolvedValue([mockStudent]);
      prisma.student.count.mockResolvedValue(1);

      await service.findAll({}, mockTeacherUser);

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institutionId: mockInstitutionId,
          }),
        }),
      );
    });

    it('2. Resolves student by USN, rollNumber, or internal cuid in findById', async () => {
      prisma.student.findFirst.mockResolvedValue(mockStudent);

      const res = await service.findById('1VI23CS058', mockTeacherUser);

      expect(prisma.student.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { id: '1VI23CS058' },
            { studentId: { equals: '1VI23CS058', mode: 'insensitive' } },
            { usn: { equals: '1VI23CS058', mode: 'insensitive' } },
            { rollNumber: { equals: '1VI23CS058', mode: 'insensitive' } },
          ],
        },
        include: { department: true, course: true, institution: true },
      });
      expect(res.id).toBe(mockStudent.id);
    });

    it('3. Rejects cross-tenant student lookup with ForbiddenException', async () => {
      prisma.student.findFirst.mockResolvedValue(mockStudent); // institutionId is inst-vemana-01

      await expect(
        service.findById('1VI23CS058', mockCrossTenantUser), // caller is inst-other-02
      ).rejects.toThrow(ForbiddenException);
    });

    it('4. Queries active enrollment session dynamically rather than hardcoded 408', async () => {
      prisma.student.findFirst.mockResolvedValue({
        ...mockStudent,
        faceImages: [],
        faceEmbeddings: [],
      });
      prisma.studentCluster.findMany.mockResolvedValue([]);
      prisma.enrollmentSession.findFirst.mockResolvedValue({
        id: 'sess-active-999',
        status: 'ACTIVE',
      });

      // Global fetch mock to prevent network call
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ clusters: [] as any[] }),
      } as any);

      try {
        await service.getStudentBiometrics('1VI23CS058', mockTeacherUser);
        expect(prisma.enrollmentSession.findFirst).toHaveBeenCalledWith({
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        });
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('resetAllEnrolledStudents (SEC-07 Regression)', () => {
    it('MUST scope student update and biometric purge strictly to caller institutionId', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      } as any);

      try {
        await service.resetAllEnrolledStudents(mockTeacherUser);

        expect(prisma.student.updateMany).toHaveBeenCalledWith({
          where: { institutionId: mockInstitutionId, faceEnrolled: true },
          data: {
            faceEnrolled: false,
            faceSamples: 0,
            profilePhoto: null,
            primaryFaceImagePath: null,
          },
        });
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('MUST reject reset attempt when no institution context is provided', async () => {
      const callerWithoutInst: any = {
        id: 'no-inst-user',
        roles: [RoleName.INSTITUTION_ADMIN],
      };

      await expect(
        service.resetAllEnrolledStudents(callerWithoutInst),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
