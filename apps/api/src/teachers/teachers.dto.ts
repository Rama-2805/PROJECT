import { IsString, IsOptional, IsEmail, IsBoolean } from 'class-validator';

export class CreateTeacherDto {
  @IsOptional() @IsString() institutionId?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() employeeId?: string;
  @IsString() fullName: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() password?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() specialization?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsBoolean() isHod?: boolean;
}

export class ResetTeacherPasswordDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

export class UpdateTeacherDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() specialization?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
