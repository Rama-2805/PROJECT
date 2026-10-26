import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
} from 'class-validator';

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

export class ManualEnrollmentDto {
  @IsString() studentId: string;
  @IsArray() images: string[]; // Base64 or image paths
  @IsOptional() @IsBoolean() setAsPrimary?: boolean;
}

export class ApproveUnknownClusterDto {
  @IsString() clusterId: string;
  @IsString() studentId: string;
}

export class BulkImportBiometricsDto {
  @IsString() institutionId: string;
  @IsString() zipOrFolderPath: string;
  @IsOptional() @IsString() csvMappingPath?: string;
}

export class CreateAutomaticSessionDto {
  @IsOptional() @IsString() id?: string;
  @IsString() name: string;
  @IsOptional() @IsString() institutionId?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() programId?: string;
  @IsOptional() @IsString() semesterId?: string;
  @IsOptional() @IsString() sectionId?: string;
  @IsOptional() @IsString() subjectId?: string;
  @IsOptional() @IsString() teacherId?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() program?: string;
  @IsOptional() @IsString() semester?: string;
  @IsOptional() @IsString() section?: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() teacher?: string;
  @IsOptional() @IsString() classroomId?: string;
  @IsOptional() @IsString() classNumber?: string;
  @IsOptional() @IsString() roomNumber?: string;
  @IsOptional() @IsString() building?: string;
  @IsOptional() @IsNumber() floor?: number;
  @IsOptional() @IsNumber() capacity?: number;
  @IsOptional() @IsString() lectureDate?: string;
  @IsOptional() @IsString() lectureTime?: string;
}

export class UploadSessionVideosDto {
  @IsString() sessionId: string;
  @IsArray() videoPaths: string[];
}

export class AssignClusterStudentDto {
  @IsString() clusterId: string;
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsBoolean() force?: boolean;
  @IsOptional() @IsString() existingStudentId?: string;
  @IsOptional() @IsString() studentId?: string;
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() usn?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() programId?: string;
  @IsOptional() @IsString() semesterId?: string;
  @IsOptional() @IsString() semester?: string;
  @IsOptional() @IsString() sectionId?: string;
  @IsOptional() @IsString() section?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() bestImagePath?: string;
  @IsOptional() @IsString() bestImageUrl?: string;
  @IsOptional() @IsNumber() sampleCount?: number;
}

export class FinalizeSessionDto {
  @IsString() sessionId: string;
}
