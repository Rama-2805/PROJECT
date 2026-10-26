# Technical Debt Assessment — SmartCampus AI

This document provides a detailed, categorized breakdown of technical debt accumulated across architecture, code hygiene, automated testing, authentication, and UI layers.

---

## 1. Architectural & Concurrency Debt

### A. Celery Worker Queue Bypassed for In-Process Threads
- **Severity**: High
- **Description**: Celery is installed (`celery==5.4.0`) and Redis is configured in `docker-compose.yml`, but `apps/ai-service/app/api/session_enrollment.py` delegates 45-minute classroom video processing jobs to FastAPI's in-process `BackgroundTasks` thread pool.
- **Impact**: Uvicorn worker threads become CPU-bound during multi-face detection and HDBSCAN clustering, causing real-time camera ingestion streams on `/api/camera/stream` to lag or drop frames.
- **Remediation**: Move `ClassroomPipeline.process()` to Celery tasks with Redis broker and task progress polling.

### B. MinIO S3 Storage Declared but Bypassed
- **Severity**: Medium
- **Description**: MinIO is configured in Docker, but video uploads and facial gallery crops are saved to local disk (`uploads/` and `storage/`).
- **Impact**: Prevents horizontal scaling of NestJS or FastAPI across multiple Kubernetes pods or Docker containers without shared network storage (NFS/EFS).
- **Remediation**: Wrap file read/write operations with an S3 SDK client adapter.

### C. SQLite Fallback Split-Brain Risk
- **Severity**: Medium
- **Description**: `apps/ai-service/app/config/database.py` falls back to `smartcampus_dev.db` if PostgreSQL is unreachable.
- **Impact**: If network blips disconnect PostgreSQL temporarily, the AI service writes attendance and cluster records to SQLite while the API reads from PostgreSQL, creating silent data desynchronization.
- **Remediation**: Add explicit retry-backoff connection policies and fail-fast health check indicators instead of silent SQLite fallback in production.

---

## 2. Code Hygiene & Static Analysis Debt

### A. 1,504 Total ESLint Problems Across Monorepo
- **NestJS API (`apps/api`)**:
  - **973 Errors**: Dominated by `@typescript-eslint/no-explicit-any` across service parameters, empty catch blocks, and `@typescript-eslint/no-unsafe-assignment`.
  - **21 Warnings**: Unused variables and parameter assignments.
- **Next.js Web (`apps/web`)**:
  - **278 Errors**: Dominated by `react-hooks/set-state-in-effect` (calling `setState` synchronously within `useEffect` bodies in `useBehaviorAlerts.ts`, `demo-mode.tsx`, `useMediaQuery.ts`).
  - **232 Warnings**: Unused imports and variables across UI pages.

---

## 3. Automated Testing Debt

### Test Coverage Deficit Summary
| Component | Unit Tests | Integration / E2E Tests | Automated Coverage |
| :--- | :---: | :---: | :---: |
| **`apps/ai-service`** | 23 | 15 (9 YOLO26 + 6 Pipeline) | **~75%** |
| **`apps/api`** | 1 (`app.controller.spec.ts`) | 1 (`app.e2e-spec.ts`) | **< 5%** |
| **`apps/web`** | 0 | 0 | **0%** |

- **Impact**: Changes to database models, student CRUD services, or classroom scheduling cannot be automatically verified against regression errors.
- **Remediation**: Implement Jest unit test suites for NestJS domain services and Playwright E2E browser test suites for core user flows.

---

## 4. Authentication & Client Store Debt

### Client-Side Mock Authentication Bypass
- **File**: `apps/web/src/lib/store/auth.ts:28-30`
- **Pattern**:
  ```typescript
  login: async (email, password) => {
    document.cookie = "refreshToken=mock-token-123; path=/";
    setAccessToken("mock-token-123");
    set({ user: { id: "1", ... }, isAuthenticated: true });
  }
  ```
- **File**: `apps/web/src/lib/userStore.ts:50-80` (Client-side SHA-256 hash checking in `localStorage`).
- **Impact**: Causes authentication desynchronization where users appear logged in with administrative privileges in the browser, but background API requests to NestJS fail with 401 Unauthorized.
- **Remediation**: Remove mock token generation and enforce strict NestJS JWT session verification.

---

## 5. UI Prototype vs. Real Telemetry Debt

### Static Mock Data in Production Navigation
- **Affected Routes**:
  - `/dashboard/ai-brain` (`apps/web/src/app/dashboard/ai-brain/page.tsx` — hardcoded multi-agent data)
  - `/dashboard/digital-twin` (`apps/web/src/app/dashboard/digital-twin/page.tsx` — hardcoded 3D telemetry)
  - `/dashboard/ai-datasets` (`apps/web/src/app/dashboard/ai-datasets/page.tsx` — static dataset cards)
  - `/teacher/unknown-faces` (`apps/web/src/app/teacher/unknown-faces/page.tsx` — Unsplash mock cluster images)
- **Impact**: End users and evaluators encounter non-functional demo screens mixed alongside verified operational modules.
- **Remediation**: Add a "Prototype / Roadmap Preview" badge or feature-flag these routes behind an environment variable (`NEXT_PUBLIC_ENABLE_PROTOTYPES=false`).
