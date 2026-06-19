// ─── SmartCampus AI — MLOps Mock Data ──────────────────────

export interface Annotation {
  id: string; sourceType: string; label: string; status: string;
  annotatedById: string; annotationType: string; confidence: number;
  reviewerId: string | null; reviewNotes: string | null;
  boundingBox: { x: number; y: number; w: number; h: number } | null;
  createdAt: Date;
}

export interface FeedbackItem {
  id: string; feedbackType: string; description: string;
  originalResult: unknown; correctedValue: unknown; severity: string; status: string;
  metadata?: Record<string, unknown>; metrics?: Record<string, unknown>;
  usedForTraining: boolean; createdAt: Date;
}

export interface DeploymentPipeline {
  id: string; name: string; modelType: string; modelVersion: string;
  stage: string; status: string; canaryPercent: number;
  observationHours: number; hasRollback: boolean;
  startedAt: Date; completedAt: Date | null;
}

export interface EdgeModelDeployment {
  id: string; deviceId: string; deviceName: string;
  modelName: string; currentVersion: string; targetVersion: string;
  status: string; checksumVerified: boolean; signatureVerified: boolean;
  lastUpdatedAt: Date;
}

export interface ResearchExperiment {
  id: string; name: string; modelType: string;
  trainingAccuracy: number; validationAccuracy: number;
  precision: number; recall: number; f1Score: number;
  avgLatency: number; datasetVersion: string;
  trainingTimeHours: number; status: string;
  createdAt: Date;
}

// ── Annotations ───────────────────────────────────────────
export const MOCK_ANNOTATIONS: Annotation[] = [
  { id: "ann-1", sourceType: "IMAGE", label: "CSE2026001 - frontal", status: "APPROVED", annotatedById: "ai-researcher-1", annotationType: "FACE_LANDMARK", confidence: 0.97, reviewerId: "reviewer-1", reviewNotes: "High quality, clean landmarks", boundingBox: { x: 120, y: 80, w: 200, h: 240 }, createdAt: new Date("2025-06-01") },
  { id: "ann-2", sourceType: "IMAGE", label: "PHONE_USAGE", status: "APPROVED", annotatedById: "ai-researcher-1", annotationType: "BEHAVIOR_LABEL", confidence: 0.95, reviewerId: "reviewer-1", reviewNotes: "Clear phone usage", boundingBox: { x: 300, y: 150, w: 80, h: 120 }, createdAt: new Date("2025-06-02") },
  { id: "ann-3", sourceType: "VIDEO_FRAME", label: "CSE2026005 - profile", status: "PENDING", annotatedById: "ai-researcher-2", annotationType: "FACE_LANDMARK", confidence: 0.82, reviewerId: null, reviewNotes: null, boundingBox: { x: 90, y: 100, w: 150, h: 180 }, createdAt: new Date("2025-06-03") },
  { id: "ann-4", sourceType: "IMAGE", label: "SLEEPING", status: "REVIEWED", annotatedById: "ai-researcher-2", annotationType: "OBJECT_LABEL", confidence: 0.88, reviewerId: "reviewer-1", reviewNotes: "Possible false positive - student resting eyes", boundingBox: { x: 50, y: 200, w: 180, h: 150 }, createdAt: new Date("2025-06-04") },
  { id: "ann-5", sourceType: "VIDEO_FRAME", label: "DISTRACTED", status: "REJECTED", annotatedById: "ai-researcher-1", annotationType: "BEHAVIOR_LABEL", confidence: 0.65, reviewerId: "reviewer-2", reviewNotes: "Low confidence, student was taking notes", boundingBox: { x: 200, y: 120, w: 160, h: 200 }, createdAt: new Date("2025-06-05") },
  { id: "ann-6", sourceType: "IMAGE", label: "ATTENTIVE", status: "PENDING", annotatedById: "ai-researcher-3", annotationType: "BEHAVIOR_LABEL", confidence: 0.91, reviewerId: null, reviewNotes: null, boundingBox: null, createdAt: new Date("2025-06-06") },
  { id: "ann-7", sourceType: "VIDEO_FRAME", label: "CSE2026010 - left", status: "APPROVED", annotatedById: "ai-researcher-2", annotationType: "FACE_LANDMARK", confidence: 0.94, reviewerId: "reviewer-2", reviewNotes: "Good profile capture", boundingBox: { x: 400, y: 50, w: 170, h: 210 }, createdAt: new Date("2025-06-07") },
  { id: "ann-8", sourceType: "IMAGE", label: "PHONE_USAGE", status: "PENDING", annotatedById: "ai-researcher-3", annotationType: "OBJECT_LABEL", confidence: 0.78, reviewerId: null, reviewNotes: null, boundingBox: { x: 280, y: 180, w: 60, h: 100 }, createdAt: new Date("2025-06-08") },
];

// ── Feedback Items ─────────────────────────────────────────
export const MOCK_FEEDBACK: FeedbackItem[] = [
  { id: "fb-1", feedbackType: "WRONG_RECOGNITION", description: "Student CSE2026002 misidentified as CSE2026015 during low-light conditions", originalResult: { recognizedId: "CSE2026015", confidence: 0.72 }, correctedValue: { correctId: "CSE2026002" }, severity: "MAJOR", status: "RESOLVED", usedForTraining: true, createdAt: new Date("2025-06-02") },
  { id: "fb-2", feedbackType: "FALSE_POSITIVE", description: "Phone usage detected when student was actually holding a book", originalResult: { behavior: "PHONE_USAGE", confidence: 0.85 }, correctedValue: { correctBehavior: "ATTENTIVE" }, severity: "MINOR", status: "OPEN", usedForTraining: false, createdAt: new Date("2025-06-10") },
  { id: "fb-3", feedbackType: "BEHAVIOR_MISTAKE", description: "Sleeping detection triggered for student looking down at notes", originalResult: { behavior: "SLEEPING", confidence: 0.78 }, correctedValue: { correctBehavior: "ATTENTIVE" }, severity: "MAJOR", status: "ACKNOWLEDGED", usedForTraining: false, createdAt: new Date("2025-06-11") },
  { id: "fb-4", feedbackType: "FALSE_NEGATIVE", description: "Student CSE2026020 was present but not recognized (wearing glasses)", originalResult: { recognizedId: null, confidence: 0.45 }, correctedValue: { correctId: "CSE2026020" }, severity: "MAJOR", status: "OPEN", usedForTraining: false, createdAt: new Date("2025-06-12") },
  { id: "fb-5", feedbackType: "ACCURACY_ISSUE", description: "Low confidence detections in classroom LAB-301 during afternoon session", originalResult: { avgConfidence: 0.62, sessionId: "SES-301" }, correctedValue: { expectedConfidence: 0.85 }, severity: "CRITICAL", status: "OPEN", usedForTraining: false, createdAt: new Date("2025-06-13") },
  { id: "fb-6", feedbackType: "GENERAL", description: "Recognition delay of ~5 seconds on edge device ECE-002", originalResult: { latencyMs: 5200, deviceId: "ECE-002" }, correctedValue: null, severity: "MINOR", status: "RESOLVED", usedForTraining: false, createdAt: new Date("2025-06-08") },
];

// ── Deployment Pipeline ───────────────────────────────────
export const MOCK_DEPLOYMENTS: DeploymentPipeline[] = [
  { id: "dep-1", name: "ArcFace v2.1.0 Production Release", modelType: "FACE_RECOGNITION", modelVersion: "2.1.0", stage: "PRODUCTION", status: "COMPLETED", canaryPercent: 100, observationHours: 48, hasRollback: false, startedAt: new Date("2025-06-04"), completedAt: new Date("2025-06-06") },
  { id: "dep-2", name: "Behavior Model v1.3.0", modelType: "BEHAVIOR", modelVersion: "1.3.0", stage: "PRODUCTION", status: "COMPLETED", canaryPercent: 100, observationHours: 72, hasRollback: false, startedAt: new Date("2025-06-08"), completedAt: new Date("2025-06-11") },
  { id: "dep-3", name: "Pose Classifier v2.0.0-beta Staging", modelType: "POSE", modelVersion: "2.0.0-beta", stage: "STAGING", status: "OBSERVING", canaryPercent: 100, observationHours: 24, hasRollback: true, startedAt: new Date("2025-06-12"), completedAt: null },
  { id: "dep-4", name: "ArcFace v2.2.0 Threshold Calibration", modelType: "FACE_RECOGNITION", modelVersion: "2.2.0-beta", stage: "AB_TESTING", status: "RUNNING", canaryPercent: 10, observationHours: 4, hasRollback: true, startedAt: new Date("2025-06-14"), completedAt: null },
  { id: "dep-5", name: "Behavior Model v1.4.0 Canary", modelType: "BEHAVIOR", modelVersion: "1.4.0-beta", stage: "VALIDATION", status: "PENDING", canaryPercent: 0, observationHours: 0, hasRollback: true, startedAt: new Date("2025-06-15"), completedAt: null },
];

// ── Edge Model Deployments ─────────────────────────────────
export const MOCK_EDGE_DEPLOYMENTS: EdgeModelDeployment[] = [
  { id: "ed-1", deviceId: "JSN-001", deviceName: "Jetson Nano - LAB-101", modelName: "ArcFace", currentVersion: "2.1.0", targetVersion: "2.1.0", status: "UPTODATE", checksumVerified: true, signatureVerified: true, lastUpdatedAt: new Date("2025-06-07") },
  { id: "ed-2", deviceId: "RPI-001", deviceName: "Pi 5 - LAB-201", modelName: "ArcFace", currentVersion: "2.0.0", targetVersion: "2.1.0", status: "UPDATE_AVAILABLE", checksumVerified: true, signatureVerified: false, lastUpdatedAt: new Date("2025-05-20") },
  { id: "ed-3", deviceId: "JSN-002", deviceName: "Jetson Nano - LAB-202", modelName: "Behavior YOLO", currentVersion: "1.2.0", targetVersion: "1.3.0", status: "UPDATING", checksumVerified: false, signatureVerified: false, lastUpdatedAt: new Date("2025-06-13") },
  { id: "ed-4", deviceId: "RPI-002", deviceName: "Pi 5 - LAB-301", modelName: "ArcFace", currentVersion: "2.1.0", targetVersion: "2.1.0", status: "UPTODATE", checksumVerified: true, signatureVerified: true, lastUpdatedAt: new Date("2025-06-10") },
  { id: "ed-5", deviceId: "CORAL-001", deviceName: "Coral TPU - LIB-001", modelName: "Behavior YOLO", currentVersion: "1.1.0", targetVersion: "1.3.0", status: "UPDATE_AVAILABLE", checksumVerified: false, signatureVerified: false, lastUpdatedAt: new Date("2025-04-15") },
  { id: "ed-6", deviceId: "JSN-003", deviceName: "Jetson Nano - LAB-302", modelName: "ArcFace", currentVersion: "2.0.0", targetVersion: "2.1.0", status: "OFFLINE", checksumVerified: false, signatureVerified: false, lastUpdatedAt: new Date("2025-06-01") },
];

// ── Research Experiments (for comparison) ──────────────────
export const MOCK_RESEARCH_EXPERIMENTS: ResearchExperiment[] = [
  { id: "rex-1", name: "ArcFace v2.1 Baseline", modelType: "FACE_RECOGNITION", trainingAccuracy: 98.5, validationAccuracy: 97.9, precision: 0.985, recall: 0.981, f1Score: 0.983, avgLatency: 145, datasetVersion: "1.0.0", trainingTimeHours: 18, status: "COMPLETED", createdAt: new Date("2025-05-15") },
  { id: "rex-2", name: "ArcFace v2.1 + Augmented Data", modelType: "FACE_RECOGNITION", trainingAccuracy: 99.1, validationAccuracy: 98.7, precision: 0.992, recall: 0.988, f1Score: 0.990, avgLatency: 120, datasetVersion: "2.0.0", trainingTimeHours: 24, status: "COMPLETED", createdAt: new Date("2025-06-01") },
  { id: "rex-3", name: "ArcFace v2.2 Threshold Tuning", modelType: "FACE_RECOGNITION", trainingAccuracy: 0, validationAccuracy: 0, precision: 0, recall: 0, f1Score: 0, avgLatency: 110, datasetVersion: "2.0.0", trainingTimeHours: 6, status: "RUNNING", createdAt: new Date("2025-06-14") },
  { id: "rex-4", name: "YOLO Behavior v1.2 Baseline", modelType: "BEHAVIOR", trainingAccuracy: 91.2, validationAccuracy: 89.8, precision: 0.912, recall: 0.895, f1Score: 0.903, avgLatency: 95, datasetVersion: "0.5.0", trainingTimeHours: 36, status: "COMPLETED", createdAt: new Date("2025-04-10") },
  { id: "rex-5", name: "YOLO Behavior v1.3 Augmented", modelType: "BEHAVIOR", trainingAccuracy: 94.5, validationAccuracy: 92.3, precision: 0.935, recall: 0.918, f1Score: 0.926, avgLatency: 85, datasetVersion: "1.0.0", trainingTimeHours: 48, status: "COMPLETED", createdAt: new Date("2025-06-05") },
  { id: "rex-6", name: "Pose Classifier v1.0", modelType: "POSE", trainingAccuracy: 82.5, validationAccuracy: 79.1, precision: 0.815, recall: 0.792, f1Score: 0.803, avgLatency: 55, datasetVersion: "0.5.0", trainingTimeHours: 12, status: "COMPLETED", createdAt: new Date("2025-05-01") },
  { id: "rex-7", name: "Pose Classifier v2.0-beta", modelType: "POSE", trainingAccuracy: 88.2, validationAccuracy: 85.7, precision: 0.872, recall: 0.851, f1Score: 0.861, avgLatency: 42, datasetVersion: "1.0.0", trainingTimeHours: 36, status: "COMPLETED", createdAt: new Date("2025-06-10") },
];
