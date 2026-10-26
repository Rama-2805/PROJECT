import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateDepartmentDto {
  @IsOptional() @IsString() institutionId?: string;
  @IsString() name: string;
  @IsString() code: string;
  @IsOptional() @IsString() hodName?: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateDepartmentDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() hodName?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
