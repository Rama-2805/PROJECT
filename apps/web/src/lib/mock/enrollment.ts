export interface EnrollmentJob {
  jobId: string;
  institutionId: string;
  classroomId: string;
  uploadedBy: string;
  videoPath: string;
  status: "PENDING" | "PROCESSING" | "REVIEW_REQUIRED" | "COMPLETED" | "FAILED";
  progressPercentage: number;
  totalFrames: number;
  processedFrames: number;
  detectedFacesCount: number;
  generatedClusters: number;
  videoName: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface FaceCluster {
  clusterId: string;
  jobId: string;
  sampleCount: number;
  qualityScore: number;
  confidence: number;
  status: "UNASSIGNED" | "ASSIGNED" | "MERGED" | "DELETED";
  assignedStudentId?: string;
  assignedStudentName?: string;
  representativeFace?: string;
  thumbnailPaths: string[];
  initials: string;
}

export interface EnrollmentState {
  currentJob: EnrollmentJob | null;
  jobs: EnrollmentJob[];
  clusters: FaceCluster[];
  isProcessing: boolean;
}

const MOCK_CLUSTERS: FaceCluster[] = [
  { clusterId: "CLUSTER_001", jobId: "JOB_A1B2C3", sampleCount: 25, qualityScore: 0.94, confidence: 98.2, status: "UNASSIGNED", thumbnailPaths: [], initials: "AS" },
  { clusterId: "CLUSTER_002", jobId: "JOB_A1B2C3", sampleCount: 40, qualityScore: 0.91, confidence: 96.5, status: "UNASSIGNED", thumbnailPaths: [], initials: "PK" },
  { clusterId: "CLUSTER_003", jobId: "JOB_A1B2C3", sampleCount: 18, qualityScore: 0.89, confidence: 94.1, status: "UNASSIGNED", thumbnailPaths: [], initials: "RV" },
  { clusterId: "CLUSTER_004", jobId: "JOB_A1B2C3", sampleCount: 32, qualityScore: 0.87, confidence: 92.8, status: "UNASSIGNED", thumbnailPaths: [], initials: "SM" },
  { clusterId: "CLUSTER_005", jobId: "JOB_A1B2C3", sampleCount: 12, qualityScore: 0.85, confidence: 89.5, status: "UNASSIGNED", thumbnailPaths: [], initials: "AG" },
  { clusterId: "CLUSTER_006", jobId: "JOB_A1B2C3", sampleCount: 28, qualityScore: 0.82, confidence: 87.3, status: "UNASSIGNED", thumbnailPaths: [], initials: "VK" },
  { clusterId: "CLUSTER_007", jobId: "JOB_A1B2C3", sampleCount: 8, qualityScore: 0.78, confidence: 82.1, status: "UNASSIGNED", thumbnailPaths: [], initials: "NS" },
  { clusterId: "CLUSTER_008", jobId: "JOB_A1B2C3", sampleCount: 15, qualityScore: 0.74, confidence: 78.6, status: "UNASSIGNED", thumbnailPaths: [], initials: "DP" },
];

const MOCK_JOBS: EnrollmentJob[] = [
  {
    jobId: "JOB_A1B2C3",
    institutionId: "inst-001",
    classroomId: "room-023",
    uploadedBy: "Dr. Rajesh Kumar",
    videoPath: "/data/uploads/JOB_A1B2C3.mp4",
    status: "REVIEW_REQUIRED",
    progressPercentage: 100,
    totalFrames: 3400,
    processedFrames: 3400,
    detectedFacesCount: 3200,
    generatedClusters: 65,
    videoName: "CSE301_Lecture_12_June.mp4",
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 3700000).toISOString(),
  },
  {
    jobId: "JOB_D4E5F6",
    institutionId: "inst-001",
    classroomId: "room-015",
    uploadedBy: "Dr. Priya Sharma",
    videoPath: "/data/uploads/JOB_D4E5F6.mp4",
    status: "COMPLETED",
    progressPercentage: 100,
    totalFrames: 2800,
    processedFrames: 2800,
    detectedFacesCount: 2400,
    generatedClusters: 48,
    videoName: "ECE201_Lecture_10_June.mp4",
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 82800000).toISOString(),
    createdAt: new Date(Date.now() - 86600000).toISOString(),
  },
  {
    jobId: "JOB_G7H8I9",
    institutionId: "inst-001",
    classroomId: "room-008",
    uploadedBy: "Dr. Suresh Patel",
    videoPath: "/data/uploads/JOB_G7H8I9.mp4",
    status: "PROCESSING",
    progressPercentage: 78,
    totalFrames: 4200,
    processedFrames: 3276,
    detectedFacesCount: 1800,
    generatedClusters: 0,
    videoName: "ME201_Lab_11_June.mp4",
    startedAt: new Date(Date.now() - 1800000).toISOString(),
    createdAt: new Date(Date.now() - 1900000).toISOString(),
  },
];

export function getEnrollmentJobs(institutionId?: string): Promise<EnrollmentJob[]> {
  let jobs = [...MOCK_JOBS];
  if (institutionId) jobs = jobs.filter((j) => j.institutionId === institutionId);
  return Promise.resolve(jobs);
}

export function getEnrollmentJobById(jobId: string): Promise<EnrollmentJob | undefined> {
  return Promise.resolve(MOCK_JOBS.find((j) => j.jobId === jobId));
}

export function getClustersForJob(jobId: string): Promise<FaceCluster[]> {
  return Promise.resolve(MOCK_CLUSTERS.filter((c) => c.jobId === jobId));
}

export function simulateEnrollmentProgress(jobId: string): Promise<number> {
  return new Promise((resolve) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        resolve(progress);
      }
    }, 800);
  });
}
