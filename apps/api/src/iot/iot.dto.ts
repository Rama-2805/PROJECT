import { IsString, IsOptional, IsNumber, IsEnum } from "class-validator";

export class RegisterDeviceDto {
  @IsString() deviceId: string;
  @IsString() deviceName: string;
  @IsString() deviceType: string;
  @IsString() classroomId: string;
  @IsString() institutionId: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() firmwareVersion?: string;
  @IsOptional() @IsString() modelVersion?: string;
}

export class HeartbeatDto {
  @IsString() deviceId: string;
  @IsString() status: string;
  @IsNumber() cpu: number;
  @IsNumber() memory: number;
  @IsNumber() temperature: number;
  @IsOptional() @IsString() network?: string;
  @IsOptional() @IsNumber() uptimeSeconds?: number;
  @IsOptional() @IsString() firmwareVersion?: string;
  @IsOptional() @IsString() aiModel?: string;
}

export class DeviceLogDto {
  @IsString() deviceId: string;
  @IsString() level: string; // INFO, WARNING, ERROR
  @IsString() message: string;
  @IsOptional() metadata?: any;
}

export class DeviceCommandDto {
  @IsString() command: string; // RESTART, RESTART_AI, UPDATE_CONFIG, UPDATE_MODEL, DIAGNOSTIC
  @IsOptional() parameters?: any;
}

export class DeviceFilterDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() classroomId?: string;
  @IsOptional() @IsString() deviceType?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsNumber() page?: number;
  @IsOptional() @IsNumber() limit?: number;
}

export class AuthDeviceDto {
  @IsString() deviceId: string;
  @IsString() deviceType: string;
}
