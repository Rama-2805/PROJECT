// ─── SmartCampus AI — MLOps DTOs ─────────────────────────────

export interface DatasetDto {
  id: string;
  name: string;
  description?: string;
  datasetType: 'FACE' | 'BEHAVIOR' | 'CLASSROOM_ACTIVITY' | 'SYNTHETIC';
  sampleCount: number;
  classCount: number;
  qualityScore: number;
  source?: string;
  status: string;
  isPublic: boolean;
  versions?: DatasetVersionDto[];
  createdAt: Date;
}

export interface DatasetVersionDto {
  id: string;
  datasetId: string;
  version: string;
  sampleCount: number;
  trainSplit: number;
  valSplit: number;
  testSplit: number;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
}

export interface ExperimentDto {
  id: string;
  experimentId: string;
  name: string;
  description?: string;
  modelId?: string;
  datasetId?: string;
  datasetVersion?: string;
  modelType: string;
  parameters?: any;
  trainingAccuracy: number;
  validationAccuracy: number;
  lossCurve?: number[];
  metrics?: any;
  trainingTime: number;
  status: string;
  startedAt?: Date;
  completedAt?: Date;
  createdBy?: string;
  createdAt: Date;
}

export interface TrainingJobDto {
  id: string;
  jobId: string;
  experimentId: string;
  modelId?: string;
  modelType: string;
  config?: any;
  epoch: number;
  totalEpochs: number;
  batchSize: number;
  learningRate: number;
  gpuRequired: boolean;
  status: string;
  progress: number;
  currentLoss?: number;
  currentAccuracy?: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
}

export interface AnnotationDto {
  id: string;
  datasetId?: string;
  modelId?: string;
  sourceType: string;
  sourcePath?: string;
  label?: string;
  boundingBox?: any;
  landmarks?: any;
  confidence: number;
  annotatedById?: string;
  annotationType: string;
  status: string;
  reviewerId?: string;
  reviewNotes?: string;
  createdAt: Date;
}

export interface FeedbackDto {
  id: string;
  feedbackType: string;
  description: string;
  originalResult?: any;
  correctedValue?: any;
  severity: string;
  status: string;
  usedForTraining: boolean;
  createdAt: Date;
}

export interface EvaluationDto {
  id: string;
  modelId: string;
  modelType: string;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
  falsePositives: number;
  falseNegatives: number;
  avgLatency: number;
  confusionMatrix?: any;
  robustnessScore: number;
  testSampleCount: number;
  datasetVersion?: string;
  status: string;
  createdAt: Date;
}

export interface AIOverviewDto {
  totalDatasets: number;
  totalModels: number;
  totalExperiments: number;
  totalTrainingJobs: number;
  totalAnnotations: number;
  totalFeedback: number;
  activeModels: number;
  productionModels: number;
  avgAccuracy: number;
  avgLatency: number;
  recentExperiments: ExperimentDto[];
  recentTrainingJobs: TrainingJobDto[];
}

export interface CreateDatasetDto {
  name: string;
  description?: string;
  datasetType: string;
  sampleCount?: number;
  classCount?: number;
  source?: string;
  isPublic?: boolean;
}

export interface CreateExperimentDto {
  name: string;
  description?: string;
  modelId?: string;
  datasetId?: string;
  datasetVersion?: string;
  modelType: string;
  parameters?: any;
}

export interface CreateTrainingJobDto {
  experimentId: string;
  modelId?: string;
  modelType: string;
  config?: any;
  totalEpochs?: number;
  batchSize?: number;
  learningRate?: number;
  gpuRequired?: boolean;
}

export interface CreateFeedbackDto {
  feedbackType: string;
  description: string;
  originalResult?: any;
  correctedValue?: any;
  severity?: string;
}

export interface CreateEvaluationDto {
  modelId: string;
  modelType: string;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
  falsePositives: number;
  falseNegatives: number;
  avgLatency: number;
  confusionMatrix?: any;
  robustnessScore?: number;
  testSampleCount?: number;
  datasetVersion?: string;
}
