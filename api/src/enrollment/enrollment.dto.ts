import { IsString, IsOptional, IsNumber, IsBoolean, IsArray } from "class-validator";

export class CreateEnrollmentJobDto {
  @IsString() institutionId: string;
  @IsString() uploadedById: string;
  @IsOptional() @IsString() classroomId?: string;
  @IsString() videoPath: string;
}

export class UpdateEnrollmentJobDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsNumber() progressPercentage?: number;
  @IsOptional() @IsNumber() processedFrames?: number;
  @IsOptional() @IsNumber() detectedFacesCount?: number;
  @IsOptional() @IsNumber() generatedClusters?: number;
  @IsOptional() @IsString() errorMessage?: string;
}

export class AssignClusterDto {
  @IsString() studentId: string;
  @IsString() studentName: string;
}

export class MergeClustersDto {
  @IsString() sourceClusterId: string;
  @IsString() targetClusterId: string;
}

export class SyncClustersDto {
  @IsArray() clusters: SyncClusterItemDto[];
}

export class SyncClusterItemDto {
  @IsString() clusterId: string;
  @IsNumber() sampleCount: number;
  @IsNumber() qualityScore: number;
  @IsOptional() @IsString() representativeFace?: string;
}
