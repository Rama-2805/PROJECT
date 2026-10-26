# Pending Work Backlog — SmartCampus AI

This document details all unfinished, disconnected, unverified, and technical-debt work required to bring SmartCampus AI to full production readiness. Work items are grouped strictly by priority: **P0 (Critical Blockers)**, **P1 (Core Features)**, **P2 (Secondary Capabilities)**, and **P3 (Polish & Optimization)**.

---

## Priority 0 (P0) — Critical Blockers & Data-Integrity Issues

### ITEM P0-1: Implement Missing `/api/behavior/resolve` Route in NestJS API
- **Priority**: P0
- **Description**: Add the missing `@Post('resolve')` route handler to `BehaviorController` in the NestJS API.
- **Evidence**: `apps/ai-service/app/services/persistence.py:145` makes an HTTP POST request to `http://localhost:4000/api/behavior/resolve`, but `apps/api/src/behavior/behavior.controller.ts` only declares `/ingest`, `/alerts/:id/acknowledge`, and `/alerts/:id/dismiss`. This causes recurring HTTP 404 errors during AI behavioral pipeline execution.
- **Affected Files**:
  - `apps/api/src/behavior/behavior.controller.ts`
  - `apps/api/src/behavior/behavior.service.ts`
- **Why It Matters**: AI behavioral background loops fail when attempting to automatically resolve or acknowledge alerts whose temporal conditions have cleared.
- **Dependencies**: None.
- **Acceptance Criteria**: `POST /api/behavior/resolve` receives an array of alert UUIDs or event identifiers, updates their status in PostgreSQL `BehaviorAlert` to `RESOLVED`, and returns HTTP 200 with the count of resolved records.
- **Estimated Effort**: 2 – 4 hours.

### ITEM P0-2: Purge Frontend Mock Auth Bypass (`userStore.ts`)
- **Priority**: P0
- **Description**: Remove the synthetic `mock-token-123` localStorage generation and enforce strict NestJS JWT session verification across all web client routes.
- **Evidence**: `apps/web/src/lib/userStore.ts:50-80` creates mock tokens using client-side SHA-256 hashes when network requests fail, allowing unauthenticated browser sessions to simulate administrative access.
- **Affected Files**:
  - `apps/web/src/lib/userStore.ts`
  - `apps/web/src/lib/store/auth.ts`
  - `apps/web/src/middleware.ts`
- **Why It Matters**: Dual authentication mechanisms lead to session drift, silent data desynchronization, and security bypasses where users appear authenticated in the UI but all real API calls fail with 401 Unauthorized.
- **Dependencies**: Item P0-1.
- **Acceptance Criteria**: Deletion of mock token generators; unauthenticated requests are redirected strictly to `/login`; all API requests pass a valid NestJS Bearer JWT.
- **Estimated Effort**: 4 – 8 hours.

### ITEM P0-3: Remediate 278 ESLint Errors and React Hook Violations in Next.js
- **Priority**: P0
- **Description**: Fix all ESLint errors in `apps/web`, specifically `react-hooks/set-state-in-effect` violations that cause infinite re-render cascades.
- **Evidence**: `npm --prefix apps/web run lint` fails with 510 problems (278 errors, 232 warnings), including violations in `useBehaviorAlerts.ts`, `demo-mode.tsx`, and `useMediaQuery.ts`.
- **Affected Files**:
  - `apps/web/src/lib/hooks/useBehaviorAlerts.ts`
  - `apps/web/src/lib/demo-mode.tsx`
  - `apps/web/src/lib/hooks/useMediaQuery.ts`
  - `apps/web/src/components/` (various)
- **Why It Matters**: Calling `setState` synchronously within `useEffect` causes browser performance degradation, UI flickering, and potential infinite rendering loops in production builds.
- **Dependencies**: None.
- **Acceptance Criteria**: `npm --prefix apps/web run lint` passes with 0 errors.
- **Estimated Effort**: 8 – 16 hours.

---

## Priority 1 (P1) — Core Features Necessary for Intended Application

### ITEM P1-1: Migrate Video Pipeline from In-Process Threads to Celery Workers
- **Priority**: P1
- **Description**: Decouple heavy classroom video decoding and clustering from FastAPI Uvicorn threads into the configured Redis-backed Celery worker pool.
- **Evidence**: `apps/ai-service/app/api/enrollment.py` and `apps/ai-service/app/api/attendance.py` utilize FastAPI `BackgroundTasks`, running CPU/GPU-intensive inference in the same process that handles real-time HTTP requests.
- **Affected Files**:
  - `apps/ai-service/app/tasks/enrollment_tasks.py`
  - `apps/ai-service/app/tasks/attendance_tasks.py`
  - `apps/ai-service/app/api/enrollment.py`
- **Why It Matters**: Concurrent processing of a 45-minute classroom enrollment video blocks the FastAPI event loop, causing live MJPEG camera streams to drop frames or timeout.
- **Dependencies**: Redis container verification.
- **Acceptance Criteria**: Long-running video enrollment jobs dispatch Celery task UUIDs; API endpoints return HTTP 202 Accepted with a task polling URL.
- **Estimated Effort**: 12 – 20 hours.

### ITEM P1-2: Fix Unknown-Face Review Client Binding
- **Priority**: P1
- **Description**: Connect the Unknown Face Review UI (`apps/web/src/app/dashboard/enrollment/review/page.tsx`) to the backend assignment and resolution endpoints.
- **Evidence**: The review UI displays face crops but has incomplete mutation dispatches to `/api/enrollment/assign-cluster` and lacks error rollback.
- **Affected Files**:
  - `apps/web/src/app/dashboard/enrollment/review/page.tsx`
  - `apps/api/src/enrollment/enrollment.service.ts`
- **Why It Matters**: Administrators cannot currently complete the workflow of manually resolving unassigned student face crops into confirmed roster profiles from the web browser.
- **Dependencies**: Item P0-2.
- **Acceptance Criteria**: Admin can view unclustered faces, select an enrolled student from a searchable dropdown, submit the association, and observe immediate FAISS index re-synchronization.
- **Estimated Effort**: 6 – 10 hours.

### ITEM P1-3: Comprehensive Automated Test Suites for NestJS API
- **Priority**: P1
- **Description**: Implement comprehensive Jest unit and integration tests across all core NestJS controllers and services (students, teachers, classrooms, attendance, enrollment).
- **Evidence**: Only 1 unit test (`app.controller.spec.ts`) and 1 e2e test (`app.e2e-spec.ts`) currently exist across the entire backend.
- **Affected Files**:
  - `apps/api/src/students/`
  - `apps/api/src/attendance/`
  - `apps/api/src/enrollment/`
  - `apps/api/src/behavior/`
- **Why It Matters**: Core business logic (cross-section exclusion, duplicate attendance prevention, RBAC enforcement) lacks regression testing.
- **Dependencies**: None.
- **Acceptance Criteria**: Test coverage reaches at least 70% across core domain services with automated CI pipeline execution.
- **Estimated Effort**: 16 – 24 hours.

---

## Priority 2 (P2) — Important Secondary Capabilities

### ITEM P2-1: MinIO S3 Object Storage Integration for Media Assets
- **Priority**: P2
- **Description**: Transition video uploads and keyframe snapshots from local disk directories (`uploads/`, `vectors/gallery/`) to the MinIO S3-compatible object store.
- **Evidence**: MinIO container is defined in `docker-compose.yml`, but NestJS and Python code use local `fs` and `path.join()`.
- **Affected Files**:
  - `apps/api/src/videos/videos.service.ts`
  - `apps/ai-service/app/services/classroom_pipeline.py`
- **Why It Matters**: Enables horizontal scaling across multiple container instances without requiring shared NFS volumes.
- **Dependencies**: Item P1-1.
- **Acceptance Criteria**: Files are uploaded to MinIO buckets (`smartcampus-videos`, `smartcampus-keyframes`) using signed URLs for authenticated streaming.
- **Estimated Effort**: 10 – 16 hours.

### ITEM P2-2: RTSP Stream Ingestion Robustness & Hardware Acceleration
- **Priority**: P2
- **Description**: Add automatic exponential backoff reconnection and FFmpeg NVDEC/VAAPI hardware decoding to the RTSP camera stream consumer.
- **Evidence**: `apps/ai-service/app/services/camera_stream.py` relies on basic `cv2.VideoCapture` loops that can hang if network sockets drop without a TCP FIN packet.
- **Affected Files**:
  - `apps/ai-service/app/services/camera_stream.py`
- **Why It Matters**: Physical IP security cameras in real educational institutions frequently drop packets or restart, requiring robust self-healing streams.
- **Dependencies**: None.
- **Acceptance Criteria**: Camera stream automatically reconnects within 5 seconds of network restoration without crashing the AI microservice.
- **Estimated Effort**: 8 – 12 hours.

### ITEM P2-3: Wire or Demote Prototype Futuristic Pages in Web Navigation
- **Priority**: P2
- **Description**: Either connect pages like `ai-brain`, `digital-twin`, and `ai-datasets` to live backend telemetry or mark them as "Roadmap Preview" in the UI.
- **Evidence**: `apps/web/src/app/dashboard/ai-brain/page.tsx` renders static mock metrics that create a misleading impression of active functionality.
- **Affected Files**:
  - `apps/web/src/components/layout/Sidebar.tsx`
  - `apps/web/src/app/dashboard/ai-brain/page.tsx`
  - `apps/web/src/app/dashboard/digital-twin/page.tsx`
- **Why It Matters**: Prevents user confusion between verified operational modules and conceptual prototype demonstrations.
- **Dependencies**: None.
- **Acceptance Criteria**: Futuristic pages clearly indicate "Telemetry Offline / Prototype Mode" or are hidden behind a feature flag.
- **Estimated Effort**: 2 – 4 hours.

---

## Priority 3 (P3) — Polish, Optimization, and Nonessential Improvements

### ITEM P3-1: End-to-End Playwright Browser Testing Suite
- **Priority**: P3
- **Description**: Implement automated browser tests covering login, class navigation, live monitoring toggle, and report export.
- **Affected Files**: `apps/web/tests/e2e/`
- **Estimated Effort**: 12 – 18 hours.

### ITEM P3-2: Production Ingress, SSL Termination & Rate Limiting
- **Priority**: P3
- **Description**: Finalize Nginx / Traefik reverse proxy configuration with Let's Encrypt automated TLS certificate renewal and API rate limiting.
- **Affected Files**: `nginx/nginx.conf`, `docker-compose.prod.yml`
- **Estimated Effort**: 6 – 10 hours.

### ITEM P3-3: Structured Telemetry & OpenTelemetry Tracing
- **Priority**: P3
- **Description**: Instrument NestJS and FastAPI services with OpenTelemetry to track end-to-end request latency across video inference and database persistence.
- **Estimated Effort**: 8 – 14 hours.
