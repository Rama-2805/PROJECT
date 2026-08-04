import { IsString, IsOptional, IsEmail, IsNumber, IsDateString, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class CreateStudentDto {
  @IsString() institutionId: string;
  @IsString() departmentId: string;
  @IsString() courseId: string;
  @IsString() studentId: string;
  @IsOptional() @IsString() rollNumber?: string;
  @IsString() fullName: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() semester?: string;
  @IsOptional() @IsString() section?: string;
  @IsOptional() @Type(() => Number) @IsNumber() batchYear?: number;
  @IsOptional() @IsString() status?: string;
}

export class UpdateStudentDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() courseId?: string;
  @IsOptional() @IsString() semester?: string;
  @IsOptional() @IsString() section?: string;
  @IsOptional() @IsString() rollNumber?: string;
  @IsOptional() @IsString() status?: string;
}

export class StudentQueryDto {
  @IsOptional() @IsString() institutionId?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() courseId?: string;
  @IsOptional() @IsString() semester?: string;
  @IsOptional() @IsString() section?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(1000) limit?: number;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @IsString() sortOrder?: "asc" | "desc";
}
