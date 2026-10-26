import {
  IsString,
  IsEmail,
  IsBoolean,
  IsOptional,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  institutionId!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  profileImage?: string;
}
