import { IsString, IsOptional, IsNumber, IsBoolean, IsArray } from "class-validator";

export class StartSessionDto {
  @IsString() institutionId: string;
  @IsString() classroomId: string;
  @IsOptional() @IsString() teacherId?: string;
  @IsOptional() @IsString() subjectName?: string;
  @IsOptional() @IsNumber() totalStudents?: number;
}

export class IngestAttendanceDto {
  @IsString() sessionId: string;
  @IsString() studentId: string;
  @IsString() studentName: string;
  @IsNumber() confidence: number;
  @IsOptional() @IsString() cameraId?: string;
  @IsOptional() @IsString() method?: string;
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
  @IsOptional() @IsNumber() page?: number;
  @IsOptional() @IsNumber() limit?: number;
}
