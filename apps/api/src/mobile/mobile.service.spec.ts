import { Test, TestingModule } from '@nestjs/testing';
import { MobileService } from './mobile.service';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from '../attendance/attendance.service';

describe('MobileService', () => {
  let service: MobileService;
  let prisma: {
    student: { findFirst: jest.Mock };
    studentParent: { findFirst: jest.Mock };
  };
  let attendance: {
    getStudentAnalytics: jest.Mock;
  };

  const mockStudent = {
    id: 'cuid-stu-1',
    studentId: '1VI23CS058',
    fullName: 'Rahul Sharma',
    semester: 6,
    department: { name: 'Computer Science' },
  };

  beforeEach(async () => {
    prisma = {
      student: { findFirst: jest.fn() },
      studentParent: { findFirst: jest.fn() },
    };
    attendance = {
      getStudentAnalytics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MobileService,
        { provide: PrismaService, useValue: prisma },
        { provide: AttendanceService, useValue: attendance },
      ],
    }).compile();

    service = module.get<MobileService>(MobileService);
  });

  describe('Canonical attendance calculation for mobile routes', () => {
    it('1. getStudentDashboard uses canonical AttendanceService rate rather than hardcoded 92.5%', async () => {
      prisma.student.findFirst.mockResolvedValue(mockStudent);
      attendance.getStudentAnalytics.mockResolvedValue({
        attendanceRate: 85.0,
        attendedSessions: 17,
        totalEligibleSessions: 20,
      });

      const res = await service.getStudentDashboard('1VI23CS058');

      expect(prisma.student.findFirst).toHaveBeenCalled();
      expect(attendance.getStudentAnalytics).toHaveBeenCalledWith(mockStudent.id);
      expect(res.attendancePercentage).toBe(85.0); // NOT hardcoded 92.5
    });

    it('2. getStudentAttendance returns real database rate and calculated attended count', async () => {
      prisma.student.findFirst.mockResolvedValue(mockStudent);
      attendance.getStudentAnalytics.mockResolvedValue({
        attendanceRate: 70.0,
        attendedSessions: 14,
        totalEligibleSessions: 20,
      });

      const res = await service.getStudentAttendance('1VI23CS058');

      expect(res.overall).toBe(70.0);
      expect(res.subjects[0].percentage).toBe(70.0);
    });

    it('3. getParentDashboard resolves linked student and retrieves canonical attendance rate', async () => {
      prisma.studentParent.findFirst.mockResolvedValue({
        student: mockStudent,
      });
      attendance.getStudentAnalytics.mockResolvedValue({
        attendanceRate: 90.0,
        attendedSessions: 18,
        totalEligibleSessions: 20,
      });

      const res = await service.getParentDashboard('parent-001');

      expect(res.attendancePercentage).toBe(90.0);
      expect(res.studentName).toBe('Rahul Sharma');
    });
  });
});
