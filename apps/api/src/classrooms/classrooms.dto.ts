import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateClassroomDto {
  @IsOptional() @IsString() institutionId?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsString() roomNumber: string;
  @IsOptional() @IsString() building?: string;
  @IsOptional() @IsNumber() floor?: number;
  @IsOptional() @IsNumber() @Min(1) capacity?: number;
  @IsOptional() devices?: string[];
}

export class UpdateClassroomDto {
  @IsOptional() @IsString() roomNumber?: string;
  @IsOptional() @IsString() building?: string;
  @IsOptional() @IsNumber() floor?: number;
  @IsOptional() @IsNumber() @Min(1) capacity?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() devices?: string[];
}
