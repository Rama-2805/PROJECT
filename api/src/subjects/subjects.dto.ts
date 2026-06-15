import { IsString, IsOptional, IsNumber, IsBoolean } from "class-validator";

export class CreateSubjectDto {
  @IsString() institutionId: string;
  @IsString() courseId: string;
  @IsString() departmentId: string;
  @IsString() name: string;
  @IsString() code: string;
  @IsOptional() @IsNumber() semester?: number;
  @IsOptional() @IsNumber() credits?: number;
  @IsOptional() @IsString() teacherId?: string;
}

export class UpdateSubjectDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() semester?: number;
  @IsOptional() @IsNumber() credits?: number;
  @IsOptional() @IsString() teacherId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
