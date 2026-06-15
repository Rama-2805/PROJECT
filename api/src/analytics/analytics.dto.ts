import { IsString, IsOptional, IsNumber, IsDateString } from "class-validator";

export class AnalyticsOverviewDto {
  @IsOptional() @IsString() institutionId?: string;
}

export class AttendanceAnalyticsQueryDto {
  @IsOptional() @IsDateString() fromDate?: string;
  @IsOptional() @IsDateString() toDate?: string;
  @IsOptional() @IsString() departmentId?: string;
}

export class StudentRiskQueryDto {
  @IsOptional() @IsString() riskLevel?: string;
  @IsOptional() @IsNumber() minScore?: number;
  @IsOptional() @IsNumber() page?: number;
  @IsOptional() @IsNumber() limit?: number;
}

export class GenerateReportDto {
  @IsString() title: string;
  @IsString() type: string; // ATTENDANCE, BEHAVIOR, STUDENT_PERFORMANCE, DEVICE_HEALTH, INSTITUTION_SUMMARY
  @IsString() format: string; // PDF, CSV, EXCEL
  @IsOptional() parameters?: {
    fromDate?: string;
    toDate?: string;
    departmentId?: string;
    classroomId?: string;
  };
}
