# Workflow Integration Audit — SmartCampus AI

This document provides a line-level end-to-end trace of all seven critical workflows across SmartCampus AI, mapping data flow from the frontend user interface through the API gateway, business services, AI microservice, and durable database persistence.

---

## Workflow 1: User Authentication & Session Management

```
User (Browser) -> /auth/login -> NestJS API (/api/auth/login) -> Argon2id Check -> JWT Issue -> HTTP Cookie / Bearer Token
```

- **Entry Point**: `apps/web/src/app/auth/login/page.tsx`
- **Participating Files**:
  - Frontend: `apps/web/src/lib/api/auth.ts`, `apps/web/src/lib/store/auth.ts`
  - Backend: `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/jwt.strategy.ts`
  - Database: `prisma/schema.prisma` (`User`, `Role`, `Institution`)
- **API Contract**: `POST /api/auth/login` (Body: `{ email, password }` -> Returns: `{ accessToken, user }`)
- **Persistence**: PostgreSQL `users` table with Argon2id salted hash.
- **Auth Boundaries**: Public endpoint; issues signed JWT containing user ID, roles, and tenant ID.
- **Error Handling**: Throws `UnauthorizedException('Invalid credentials')` on incorrect password.
- **Integration Status**: **Partially Integrated** (Backend is verified; frontend Zustand store contains mock token fallback setting `mock-token-123`).
- **Relevant Tests**: `apps/api/test/app.e2e-spec.ts` (Login test passes).
- **Known Limitations**: Frontend store falls back to synthetic local storage tokens if API call fails.

---

## Workflow 2: Classroom Video Ingestion & HTTP 206 Streaming

```
Teacher/Admin Upload -> /dashboard/face-enrollment -> NestJS /api/videos/upload -> Disk Storage (uploads/) -> Range Streaming (/api/videos/stream/:key)
```

- **Entry Point**: `apps/web/src/app/dashboard/face-enrollment/page.tsx`
- **Participating Files**:
  - Frontend: `apps/web/src/components/video/VideoPlayer.tsx`
  - Backend: `apps/api/src/videos/videos.controller.ts`, `apps/api/src/videos/videos.service.ts`
- **API Contract**:
  - Upload: `POST /api/videos/upload` (multipart/form-data)
  - Stream: `GET /api/videos/stream/:key` with HTTP `Range: bytes=start-end` header.
- **Persistence**: File written with UUID hash to disk; metadata stored in PostgreSQL.
- **Auth Boundaries**: Protected by `@UseGuards(JwtAuthGuard, RolesGuard)` requiring `TEACHER` or `ADMIN`.
- **Error Handling**: Range parser validates requested byte ranges, returns HTTP 416 on invalid bounds, and uses strict path containment to prevent directory traversal.
- **Integration Status**: **Integrated and Verified**.
- **Relevant Tests**: Manually verified; e2e video playback confirmed.
- **Known Limitations**: Local disk storage only; MinIO S3 object store not integrated.

---

## Workflow 3: Student Video Enrollment & Identity Clustering

```
Classroom Video -> AI Process Video -> YOLO26/SCRFD Detection -> Quality Filter -> ArcFace 512D -> HDBSCAN Clustering -> Cluster Review -> Roster Assignment
```

- **Entry Point**: `apps/web/src/app/dashboard/face-enrollment/page.tsx`
- **Participating Files**:
  - Backend: `apps/api/src/enrollment/enrollment.controller.ts`, `apps/api/src/enrollment/enrollment.service.ts`
  - AI Service: `apps/ai-service/app/api/session_enrollment.py`, `apps/ai-service/app/services/classroom_pipeline.py`, `apps/ai-service/app/services/face_clustering.py`
  - Vector Engine: `apps/ai-service/app/services/vector_store.py` (`FAISS IndexFlatIP`)
- **API Contract**:
  - `POST /api/enrollment/process-video`
  - `GET /api/enrollment/sessions/:id/clusters`
  - `POST /api/enrollment/assign-cluster` (Body: `{ clusterId, studentId }`)
- **Persistence**: Embeddings stored in PostgreSQL `StudentFaceEmbedding` and serialized to `vectors/face_index.faiss` with atomic write renames.
- **Auth Boundaries**: Institutional Admin or Teacher role required.
- **Error Handling**: Blurry or extreme profile faces filtered out by Laplacian variance; HDBSCAN assigns unclustered noise to cluster -1.
- **Integration Status**: **Integrated and Verified**.
- **Relevant Tests**: `apps/ai-service/tests/test_yolo26_face_pipeline.py` (9 passed), `test_pipeline.py` (6 passed).
- **Known Limitations**: Video processing runs as an in-process FastAPI background thread rather than on Celery.

---

## Workflow 4: Identity Matching & Multi-Frame Attendance Marking

```
Camera Stream -> OpenCV Stride Ingestion -> IoUTracker -> ArcFace Embeddings -> FAISS Cosine Search -> Voting Buffer (>= 3 Hits) -> NestJS /api/attendance/mark -> PostgreSQL Upsert
```

- **Entry Point**: `apps/web/src/app/dashboard/live-monitoring/page.tsx`
- **Participating Files**:
  - AI Service: `apps/ai-service/app/services/face_tracker.py` (LOCKED), `apps/ai-service/app/services/attendance_engine.py`
  - Backend: `apps/api/src/attendance/attendance.controller.ts`, `apps/api/src/attendance/attendance.service.ts`
  - WebSocket: `apps/api/src/campus/campus.gateway.ts`
- **API Contract**: `POST /api/attendance/mark` (Body: `{ sessionId, studentId, confidence, timestamp }`)
- **Persistence**: PostgreSQL `AttendanceRecord` with compound unique index `[sessionId, studentId]`.
- **Auth Boundaries**: AI service authenticates to API via internal token; WebSocket dispatches to authorized classroom subscribers.
- **Error Handling**: Rejects embeddings below 0.65 cosine threshold; prevents duplicate records via database upsert.
- **Integration Status**: **Integrated and Verified**.
- **Relevant Tests**: Pytest vector and clustering test suites passed.
- **Known Limitations**: Cross-section roster exclusions must be validated against timetable schedules.

---

## Workflow 5: Unknown Face Review & Resolution

```
Unidentified Face Crops -> Gallery Storage -> Review UI -> Student Association -> Vector Store Update
```

- **Entry Point**:
  - Primary: `apps/web/src/app/dashboard/face-enrollment/page.tsx` (Tab: "UNKNOWN")
  - Teacher Portal: `apps/web/src/app/teacher/unknown-faces/page.tsx`
- **Participating Files**:
  - Backend: `apps/api/src/enrollment/enrollment.controller.ts`, `apps/api/src/attendance/clusters.controller.ts`
  - AI Service: `apps/ai-service/app/services/image_storage.py`
- **API Contract**:
  - `GET /api/enrollment/unknown-faces`
  - `POST /api/enrollment/resolve-unknown`
- **Persistence**: Updates status in `CandidateFaceCrop` and links vector ID in FAISS metadata.
- **Auth Boundaries**: Restricted to assigned teacher or institution admin.
- **Error Handling**: Crops without student ID remain in unassigned pool.
- **Integration Status**: **Partially Integrated**.
  - Review interface in `/teacher/unknown-faces` falls back to `MOCK_CLUSTERS` if API fails.
  - Session enrollment review tab is integrated with real cluster endpoints.
- **Known Limitations**: Manual resolution currently requires full FAISS index rebuild.

---

## Workflow 6: Behavioral Monitoring & Alert Event Persistence

```
Live Feed -> YOLOv8 Person/Phone Detection -> MediaPipe Pose -> Temporal State Machine -> persistence.py -> NestJS API (/api/behavior/*) -> WebSocket Alert Dispatch
```

- **Entry Point**: `apps/web/src/app/dashboard/live-monitoring/page.tsx` (Mode: Behavioral Monitoring)
- **Participating Files**:
  - AI Service: `apps/ai-service/app/behavior/detector/hybrid_behavior_pipeline.py`, `apps/ai-service/app/behavior/tracker/behavior_tracker.py`, `apps/ai-service/app/behavior/persistence.py`
  - Backend: `apps/api/src/behavior/behavior.controller.ts`, `apps/api/src/behavior/behavior.service.ts`
  - UI: `apps/web/src/lib/hooks/useBehaviorAlerts.ts`, `AlertsDrawer.tsx`
- **API Contract**:
  - Ingestion: `POST /api/behavior/ingest`
  - Resolution: `POST /api/behavior/resolve` (**MISSING ROUTE!**)
  - Acknowledgment: `PATCH /api/behavior/alerts/:id/acknowledge`
- **Persistence**: PostgreSQL `BehaviorAlert` entity.
- **Auth Boundaries**: Teacher/HOD/Admin roles.
- **Error Handling**: Temporal state filtering prevents false triggers (phone $\ge 5$s, sleeping $\ge 10$s).
- **Integration Status**: **Broken (Concrete Route Missing)**.
  - Ingestion works, but automatic event clearance calls `POST /api/behavior/resolve` which returns HTTP 404.
- **Relevant Tests**: Unit tests for pose calculation pass; end-to-end resolution fails at runtime.
- **Known Limitations**: Missing NestJS controller endpoint.

---

## Workflow 7: Report Generation & Multi-Format Export

```
User (Teacher/Admin) -> /dashboard/reports -> Filter Parameters -> NestJS /api/reports/export -> CSV / PDF Generation -> Browser Download
```

- **Entry Point**: `apps/web/src/app/dashboard/reports/page.tsx`
- **Participating Files**:
  - Backend: `apps/api/src/reports/reports.controller.ts`, `apps/api/src/reports/reports.service.ts`
  - Scripts: `scripts/generate_tech_stack_pdf.py`
- **API Contract**:
  - `GET /api/reports/attendance/csv?classroomId=...&startDate=...&endDate=...`
  - `GET /api/reports/attendance/pdf?classroomId=...&startDate=...`
- **Persistence**: Queries PostgreSQL `AttendanceRecord` and `Student` tables; outputs generated binary stream.
- **Auth Boundaries**: Teacher or Administrator role.
- **Error Handling**: Validates date ranges and returns empty CSV headers if no matching records exist.
- **Integration Status**: **Integrated and Verified**.
- **Relevant Tests**: Verified by running PDF generator script and API controller checks.
- **Known Limitations**: Large export queries (>10,000 rows) lack streaming chunk pagination.
