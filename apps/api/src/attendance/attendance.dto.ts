import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StartSessionDto {
  @IsOptional() @IsString() institutionId?: string;
  @IsString() classroomId: string;
  @IsOptional() @IsString() teacherId?: string;
  @IsOptional() @IsString() subjectName?: string;
  @IsOptional() @IsNumber() totalStudents?: number;
  @IsOptional() @IsString() classSessionId?: string;
}

export class IngestAttendanceDto {
  @IsString() sessionId: string;
  @IsString() studentId: string;
  @IsOptional() @IsString() studentName?: string;
  @IsNumber() confidence: number;
  @IsOptional() @IsString() cameraId?: string;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() status?: 'PRESENT' | 'ABSENT' | 'LATE';
}

export class CorrectAttendanceDto {
  @IsString() status: 'PRESENT' | 'ABSENT' | 'LATE';
  @IsOptional() @IsString() reason?: string;
}

export class LiveStatusDto {
  @IsString() sessionId: string;
  @IsOptional() @IsString() classroomId?: string;
}

export class UnknownFaceDto {
  @IsString() institutionId: string;
  @IsString() classroomId: string;
  @IsOptional() @IsString() cameraId?: string;
  @IsOptional() @IsString() thumbnail?: string;
}

export class AttendanceQueryDto {
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() studentId?: string;
  @IsOptional() @IsString() classroomId?: string;
  @IsOptional() @IsString() fromDate?: string;
  @IsOptional() @IsString() toDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number;
}
