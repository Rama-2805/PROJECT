import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class CreateInstitutionDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  slug!: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  logo?: string;
}

export class UpdateInstitutionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
