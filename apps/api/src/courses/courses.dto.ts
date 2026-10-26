import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateCourseDto {
  @IsString() institutionId: string;
  @IsString() departmentId: string;
  @IsString() name: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() duration?: string;
  @IsOptional() @IsNumber() credits?: number;
}

export class UpdateCourseDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() duration?: string;
  @IsOptional() @IsNumber() credits?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
