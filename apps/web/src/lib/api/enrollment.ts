/**
 * SmartCampus AI — Enrollment API Helpers
 *
 * Typed wrappers for all enrollment-related API calls.
 * Uses the existing apiRequest client with JWT auth.
 */

import { apiRequest } from "./client";

// In production, all AI service paths are proxied through Next.js rewrites
// (/api/v1/*, /storage/*) so we use relative URLs by default.
export const AI_HTTP_URL = "";

// ── Types ────────────────────────────────────────────────────────────

export interface EnrollmentSession {
  id: string;
  name: string;
  departmentId?: string | null;
  programId?: string | null;
  semesterId?: string | null;
  sectionId?: string | null;
  subjectId?: string | null;
  teacherId?: string | null;
  lectureDate?: string | null;
  lectureTime?: string | null;
  status: "PENDING" | "PROCESSING" | "REVIEW_REQUIRED" | "COMPLETED" | "FAILED";
  totalVideos: number;
  progressPercentage: number;
  processedFrames: number;
  detectedFacesCount: number;
  generatedClusters: number;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string | null;
}

export interface ClusterImage {
  id: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  frameNumber: number;
  videoFileName: string | null;
  timestampSec: number;
  qualityScore: number;
  isBest: boolean;
  createdAt: string;
}

export interface StudentCluster {
  id: string;
  enrollmentSessionId: string;
  clusterNumber: number;
  sampleCount: number;
  qualityAvg: number;
  confidence: number;
  bestImagePath?: string | null;
  bestImageUrl?: string | null;
  firstSeenTime?: string | null;
  lastSeenTime?: string | null;
  status: "UNASSIGNED" | "ASSIGNED" | "REJECTED";
  imageCount: number;
  gallery: ClusterImage[];
  assignedStudentId?: string | null;
  assignedStudentName?: string;   // from assignment join (added client-side)
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionPayload {
  name: string;
  institutionId: string;
  departmentId?: string;
  programId?: string;
  semesterId?: string;
  sectionId?: string;
  subjectId?: string;
  teacherId?: string;
  lectureDate?: string;
  lectureTime?: string;
}

// ── Session CRUD ─────────────────────────────────────────────────────

export async function listSessions(params?: { status?: string; institutionId?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.institutionId) qs.set("institutionId", params.institutionId);
  const query = qs.toString() ? `?${qs}` : "";
  return apiRequest<EnrollmentSession[]>(`/enrollment/sessions${query}`);
}

export async function createSession(payload: CreateSessionPayload) {
  return apiRequest<EnrollmentSession>("/enrollment/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getSessionDetails(sessionId: string) {
  return apiRequest<EnrollmentSession>(`/enrollment/sessions/${sessionId}`);
}

// ── Video upload ─────────────────────────────────────────────────────

/**
 * Upload video files directly to the AI service (FastAPI) using multipart form.
 * Returns list of saved absolute file paths on the server.
 */
export async function uploadVideos(
  sessionId: string,
  files: File[],
  onProgress?: (pct: number) => void,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    formData.append("sessionId", sessionId);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${AI_HTTP_URL}/api/v1/sessions/${sessionId}/upload-videos`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          resolve(json.filePaths || json.paths || []);
        } catch {
          reject(new Error("Invalid response from upload endpoint"));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}

/**
 * Register video paths in NestJS DB (creates EnrollmentVideo records).
 */
export async function registerVideoPaths(sessionId: string, videoPaths: string[]) {
  return apiRequest(`/enrollment/sessions/${sessionId}/videos`, {
    method: "POST",
    body: JSON.stringify({ videoPaths }),
  });
}

// ── Processing ───────────────────────────────────────────────────────

/** Trigger AI pipeline for a session (NestJS → FastAPI proxy). */
export async function startSessionProcessing(sessionId: string) {
  return apiRequest(`/enrollment/sessions/${sessionId}/process`, {
    method: "POST",
  });
}

/** After ENROLLMENT_COMPLETED WebSocket event — sync AI clusters into Postgres. */
export async function syncSessionClusters(sessionId: string) {
  return apiRequest(`/enrollment/sessions/${sessionId}/sync-clusters`, {
    method: "POST",
  });
}

// ── Clusters ─────────────────────────────────────────────────────────

export async function getSessionClusters(sessionId: string, status?: string) {
  const qs = status ? `?status=${status}` : "";
  return apiRequest<StudentCluster[]>(`/enrollment/sessions/${sessionId}/clusters${qs}`);
}

export async function assignClusterStudent(payload: {
  clusterId: string;
  fullName?: string;
  usn?: string;
  email?: string;
  phone?: string;
  departmentId?: string;
  existingStudentId?: string;
}) {
  return apiRequest("/enrollment/clusters/assign-student", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function rejectCluster(clusterId: string) {
  return apiRequest(`/enrollment/clusters/${clusterId}`, { method: "DELETE" });
}

export async function finalizeSession(sessionId: string) {
  return apiRequest(`/enrollment/sessions/${sessionId}/finalize`, { method: "POST" });
}

// ── WebSocket ────────────────────────────────────────────────────────

export function getEnrollmentWsUrl(): string {
  if (process.env.NEXT_PUBLIC_AI_WS_URL) {
    return `${process.env.NEXT_PUBLIC_AI_WS_URL}/api/v1/ws`;
  }
  if (typeof window !== "undefined") {
    const isHttps = window.location.protocol === "https:";
    const host = window.location.hostname;
    // In local development, Next.js rewrites do not support WebSocket upgrades, so connect directly to AI service port 8000
    if (host === "localhost" || host === "127.0.0.1") {
      return `ws://${host}:8000/api/v1/ws`;
    }
    // In production HTTPS deployments with WSS reverse proxy
    return `${isHttps ? "wss" : "ws"}://${window.location.host}/api/v1/ws`;
  }
  return "ws://127.0.0.1:8000/api/v1/ws";
}
