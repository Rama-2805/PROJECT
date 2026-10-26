import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  institutionName!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword?: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}
