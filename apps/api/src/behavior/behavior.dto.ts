import { IsString, IsOptional, IsNumber, IsArray } from "class-validator";

export class IngestBehaviorDto {
  @IsOptional() @IsString() studentId?: string;
  @IsOptional() @IsString() sessionId?: string;
  @IsString() behaviorType: string;
  @IsNumber() confidence: number;
  @IsOptional() @IsNumber() duration?: number;
  @IsOptional() @IsString() classroomId?: string;
  @IsOptional() metadata?: any;
}

export class BehaviorQueryDto {
  @IsOptional() @IsString() studentId?: string;
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() behaviorType?: string;
  @IsOptional() @IsString() classroomId?: string;
  @IsOptional() @IsString() fromDate?: string;
  @IsOptional() @IsString() toDate?: string;
  @IsOptional() @IsNumber() page?: number;
  @IsOptional() @IsNumber() limit?: number;
}

export class AcknowledgeAlertDto {
  @IsString() acknowledgedBy: string;
}

export class CreateEngagementRecordDto {
  @IsString() studentId: string;
  @IsOptional() @IsString() sessionId?: string;
  @IsNumber() score: number;
  @IsString() level: string;
  @IsOptional() @IsNumber() attentionScore?: number;
  @IsOptional() @IsNumber() postureScore?: number;
  @IsOptional() @IsNumber() phonePenalty?: number;
  @IsOptional() @IsNumber() activityScore?: number;
}
