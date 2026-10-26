# Bugs and Technical Debt Audit — SmartCampus AI

This document provides a categorized inventory of confirmed bugs, suspected issues, disconnected implementations, duplicate logic, dead code, security concerns, performance risks, and maintainability debt discovered across the SmartCampus AI repository.

---

## 1. Confirmed / Reproduced Bugs

### BUG-01: Disconnected API Route `POST /api/behavior/resolve`
- **Category**: Concrete Runtime 404 Failure
- **Status**: **CONFIRMED & REPRODUCED**
- **Location**:
  - Caller: `apps/ai-service/app/services/persistence.py:145`
  - Target Controller: `apps/api/src/behavior/behavior.controller.ts`
- **Description**: The Python AI service includes automatic behavior resolution logic that periodically makes an HTTP POST request to `http://localhost:4000/api/behavior/resolve` with a payload of cleared track/alert IDs. In the NestJS `BehaviorController`, this route does not exist (the controller only defines `@Post('ingest')`, `@Patch('alerts/:id/acknowledge')`, and `@Patch('alerts/:id/dismiss')`). Every resolution attempt logs an unhandled HTTP 404 Not Found error in the AI service background loop.

### BUG-02: React Hook State Setting Violations in Next.js (`react-hooks/set-state-in-effect`)
- **Category**: Client Runtime Rendering Defect
- **Status**: **CONFIRMED & REPRODUCED**
- **Location**:
  - `apps/web/src/lib/hooks/useBehaviorAlerts.ts:57`
  - `apps/web/src/lib/demo-mode.tsx:45`
  - `apps/web/src/lib/hooks/useMediaQuery.ts:11`
- **Description**: Calling `setState` synchronously within the body of a `useEffect` hook triggers cascading re-renders, causing browser UI stuttering, erratic network re-fetching intervals, and potential infinite rendering loops in production builds.

### BUG-03: Dual Authentication Mock Token Desynchronization
- **Category**: Authentication / Session Drift
- **Status**: **CONFIRMED & REPRODUCED**
- **Location**: `apps/web/src/lib/userStore.ts:50-80`
- **Description**: When offline or if an API error occurs, `userStore.ts` generates a synthetic `mock-token-123` stored in `localStorage`. The client-side application transitions to an "authenticated" state, rendering administrative UI screens. However, subsequent background fetches to the NestJS backend reject `mock-token-123` with 401 Unauthorized, creating a desynchronized state where UI elements display empty data or throw unhandled promise rejections.

---

## 2. Suspected Bugs & Potential Edge Cases

### SUSP-01: Thread Starvation on Concurrent Video Uploads
- **Category**: Concurrency & Latency Degradation
- **Status**: **SUSPECTED UNDER HEAVY LOAD**
- **Location**: `apps/ai-service/app/api/enrollment.py:55`
- **Description**: Because video enrollment and frame decoding utilize FastAPI's in-process `BackgroundTasks`, concurrent processing of multiple classroom recordings executes within Uvicorn worker threads. On a multi-core server with shared CPU/GPU resources, heavy video decoding will starve the event loop, causing live MJPEG camera streams on `/api/camera/stream` to drop frames or lag.

### SUSP-02: Memory Growth from Retained Face Crops in Gallery Storage
- **Category**: Disk & Memory Leak Risk
- **Status**: **SUSPECTED OVER EXTENDED RUNTIME**
- **Location**: `apps/ai-service/app/services/classroom_pipeline.py:280`
- **Description**: Candidate face crops are written to `vectors/gallery/` during enrollment sessions. While high-quality crops are assigned to confirmed student identities, unassigned or rejected crops lack an automated time-to-live (TTL) expiration or pruning policy, leading to unbounded disk accumulation over hundreds of sessions.

---

## 3. Disconnected Implementations

### DISC-01: MinIO Container Declared but Unused
- **Location**: `docker-compose.yml:65-80`
- **Description**: `docker-compose.yml` provisions a MinIO S3 object store on ports 9000/9001. However, both the NestJS API and Python AI microservice store media files directly on the local filesystem (`uploads/videos/` and `vectors/`). The MinIO service runs idle, consuming container memory without serving any application traffic.

### DISC-02: Futuristic Prototype Dashboards Disconnected from Real Telemetry
- **Location**:
  - `apps/web/src/app/dashboard/ai-brain/page.tsx`
  - `apps/web/src/app/dashboard/digital-twin/page.tsx`
  - `apps/web/src/app/dashboard/ai-datasets/page.tsx`
  - `apps/web/src/app/dashboard/ai-synthetic/page.tsx`
- **Description**: These pages render rich, futuristic UI layouts (neural network topologies, GPU cluster heatmaps, digital twin 3D campus representations), but their data is entirely hardcoded in client-side static mock arrays. No corresponding NestJS controllers or Python telemetry endpoints exist.

---

## 4. Duplicate Logic

### DUP-01: Face Quality Calculation Redundancy
- **Location**:
  - `apps/ai-service/app/services/face_quality.py`
  - `apps/ai-service/app/services/classroom_pipeline.py:165-185`
- **Description**: Both modules independently implement Laplacian variance calculations for blur estimation and bounding box geometric aspect ratio checks. These should be unified into a single call to `FaceQualityAssessor`.

### DUP-02: Duplicate JWT Verification in WebSocket Gateway
- **Location**:
  - `apps/api/src/events/events.gateway.ts:35-50`
  - `apps/api/src/auth/strategies/jwt.strategy.ts`
- **Description**: The WebSocket gateway re-implements raw `jwtService.verify(token)` manual parsing inside the `handleConnection` lifecycle hook rather than using a dedicated NestJS WsGuard or reusable token verification helper.

---

## 5. Dead Code & Orphaned Schema Models

### DEAD-01: Futuristic Prisma Schema Models Without Domain Logic
- **Location**: `prisma/schema.prisma`
- **Models**: `CampusDrone`, `HologramNode`, `AutonomousShuttle`
- **Description**: Several experimental database models were scaffolded in the schema but have no active controllers, services, migrations, or UI views. They add unnecessary maintenance overhead to the Prisma schema.

### DEAD-02: Unused Frontend Helper Scripts
- **Location**: `apps/web/src/lib/mock/devices.ts:170`, `apps/web/src/lib/mock/enrollment.ts:119`
- **Description**: Unused mock generators and unreferenced variables identified during ESLint analysis.

---

## 6. Security & Performance Concerns

| Concern ID | Severity | File / Component | Details |
| :--- | :---: | :--- | :--- |
| **SEC-01** | Medium | `apps/web/src/lib/userStore.ts` | Client-side SHA-256 password hashing creates a false sense of security; passwords should never be processed or stored in browser local storage. |
| **SEC-02** | Low | `apps/ai-service/vectors/` | Raw FAISS binary index files (`face_index.faiss`) and student embedding arrays are stored in plaintext on disk without encryption-at-rest. |
| **PERF-01** | High | `apps/ai-service/app/services/classroom_pipeline.py` | Synchronous frame-by-frame processing in Python without batched tensor inference creates high CPU usage during multi-face detection. |
| **PERF-02** | Medium | `apps/api/src/attendance/attendance.service.ts` | Uncached repetitive database queries to fetch student section rosters during continuous multi-frame attendance marking. |

---

## 7. Maintainability & Code Quality Debt

- **Total ESLint Issues**: **1,504 problems** across the monorepo:
  - `apps/api`: 994 problems (973 errors, 21 warnings) — mostly `@typescript-eslint/no-explicit-any` and unhandled empty catch blocks.
  - `apps/web`: 510 problems (278 errors, 232 warnings) — including React hook lifecycle rule violations and unused variables.
- **Test Coverage Deficit**:
  - NestJS API: < 5% coverage (only 1 basic controller spec and 1 e2e spec).
  - Next.js Web: 0% automated test coverage.
