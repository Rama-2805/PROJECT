import { IsString, IsOptional, IsDateString } from "class-validator";

export class GenerateReportDto {
  @IsString() title: string;
  @IsString() type: string;
  @IsString() format: string;
  @IsOptional() parameters?: {
    fromDate?: string;
    toDate?: string;
    departmentId?: string;
    classroomId?: string;
  };
}

export class ReportHistoryQueryDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsDateString() fromDate?: string;
  @IsOptional() @IsDateString() toDate?: string;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}

export class ScheduledReportDto {
  @IsString() title: string;
  @IsString() type: string;
  @IsString() frequency: string; // DAILY, WEEKLY, MONTHLY
  @IsString() format: string;
  @IsOptional() recipients?: string[];
  @IsOptional() parameters?: any;
}
