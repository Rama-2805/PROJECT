# Repository Inventory & Baseline Audit — SmartCampus AI

**Audit Timestamp**: October 2026  
**Auditor Role**: Senior Software Architect, Lead DevSecOps & Technical Project Auditor  
**Repository Root**: `/Users/rama/Major project/PROJECT`  
**Current Branch**: `feature/yolo26-face-v2`  
**Head Commit**: `269e333` — *feat(checkpoint): incremental face enrollment, adaptive recognition & complete tech stack documentation*

---

## 1. Git State & Working Tree Baseline

### Active Branch & Recent Commit History
```
* 269e333 (HEAD -> feature/yolo26-face-v2, tag: checkpoint-incremental-enrollment) feat(checkpoint): incremental face enrollment, adaptive recognition & complete tech stack documentation
* 1c95b11 (origin/main, origin/HEAD, main) fix(monitoring): enable video playback and AI biometric HUD on deployed Vercel instance
* b85fe7f fix: route all video/camera/storage requests through API proxy
* 8971d9c fix(verification): fix faiss vector path resolution, support studentId in cluster assignment dto, and update identity clustering suite
* 35a816f fix(camera): make mjpeg generator async to avoid starving uvicorn event loop
```

### Uncommitted Working Tree State
The working tree contains extensive active security hardening and endpoint updates across 99 files:
- `apps/api/src/` controllers, services, guards, and DTOs (audit logging, AES-256-GCM encryption, RBAC enforcement).
- `apps/ai-service/app/` security services, image storage, attendance engines.
- `apps/web/next.config.ts` (API proxy rewrites).
- Untracked files preserved:
  - `apps/ai-service/app/behavior/persistence.py`: Behavioral event lifecycle and idempotent persistence.
  - `docs/project-audit/`: Previous audit report suite (00 through 07).

---

## 2. Structural Repository Inventory

| Directory / File | Type | Purpose | Classification |
| :--- | :--- | :--- | :--- |
| **`apps/web/`** | Next.js 16 App Router | Modern frontend UI, role-based dashboards, video streaming HUD, monitoring. | **Required for Runtime** |
| **`apps/api/`** | NestJS 11 Gateway | Central multi-tenant REST & WebSocket gateway, PostgreSQL Prisma ORM integration. | **Required for Runtime** |
| **`apps/ai-service/`** | FastAPI Microservice | Core AI inference engine: SCRFD/YOLO26-Face, ArcFace 512D, FAISS, HDBSCAN. | **Required for Runtime** |
| **`apps/mlops/`** | Python Automation | Offline retraining pipelines, dataset validation, model registry scripts. | **Required for Operational Tooling** |
| **`apps/edge-agent/`** | Edge Daemon | Edge RTSP ingestion and lightweight camera frame sampler. | **Required for Deployment** |
| **`apps/ai-brain/`** | Service Stub | Prototype decentralized multi-agent service definitions. | **Uncertain / Roadmap** |
| **`prisma/`** | Prisma ORM Schema | PostgreSQL database schema (`schema.prisma`, 1600+ lines), migrations history. | **Required for Runtime & Recovery** |
| **`docker-compose.yml`** | Container Config | Multi-service orchestration (Postgres, Redis, MQTT, MinIO, API, Web, AI Engine). | **Required for Deployment** |
| **`docker-compose.dev.yml`**| Container Config | Local lightweight infrastructure provisioning (dev-postgres, dev-redis). | **Required for Deployment** |
| **`vectors/`** | Durable Biometrics | Active FAISS binary (`face_index.faiss`) and student vector mapping (`metadata.json`). | **Required for Recovery** |
| **`storage/`** | Media Directory | Local storage for enrollment clips, cluster crops, and candidate gallery. | **Required for Runtime** |
| **`test_storage/`** | Test Fixtures | Dedicated storage root used by `pytest` test suites via `conftest.py`. | **Required for Testing** |
| **`test_vectors/`** | Test Fixtures | Dedicated vector index path used by `pytest` test suites via `conftest.py`. | **Required for Testing** |
| **`smartcampus_dev.db`** | SQLite Database | Automatic local database fallback when PostgreSQL connection drops. | **Required for Recovery** |
| **`scripts/`** | Utility Scripts | Setup automation, tech-stack PDF report generator, pipeline runners. | **Operational Tooling** |
| **`docs/`** | Markdown Documentation| Architecture specs, deployment guides, user manuals, project audit reports. | **Documentation** |

---

## 3. Comprehensive File Classification

### Category 1: Required for Runtime
- `apps/web/src/**`: Next.js pages, components, Zustand stores, API clients.
- `apps/api/src/**`: NestJS modules (auth, students, teachers, classrooms, attendance, enrollment, behavior, reports).
- `apps/ai-service/app/**`: FastAPI routers, detectors (`yolo26_detector.py`, `face_detector.py`), embedder (`face_embedder.py`), tracker (`face_tracker.py`), vector store (`vector_store.py`).
- `prisma/schema.prisma`: Database schema definitions.

### Category 2: Required for Deployment
- `docker-compose.yml`, `docker-compose.dev.yml`
- `apps/web/Dockerfile`, `apps/api/Dockerfile`, `apps/ai-service/Dockerfile`
- `apps/web/next.config.ts`, `vercel.json`
- `start.sh`, `start.bat`, `setup.sh`, `setup.bat`

### Category 3: Required for Recovery
- `prisma/migrations/**`: Version-controlled SQL migration scripts.
- `vectors/face_index.faiss`, `vectors/metadata.json`: Active biometric face embeddings and roster ID mappings.
- `smartcampus_dev.db`: Fallback SQLite store configured in `apps/ai-service/app/config/database.py`.

### Category 4: Required for Testing
- `apps/ai-service/app/tests/**`: Unit tests (23 passed).
- `apps/ai-service/tests/**`: YOLO26 face pipeline integration tests (9 passed).
- `tests/test_pipeline.py`: Legacy pipeline tests (6 passed).
- `apps/api/src/app.controller.spec.ts`: NestJS unit test.
- `apps/api/test/app.e2e-spec.ts`: NestJS e2e test suite.
- `test_storage/`, `test_vectors/`: Referenced by `conftest.py`.

### Category 5: Documentation
- `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE`
- `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/DEVELOPER_SETUP.md`
- `docs/project-audit/**`: Previous feature completion audit reports.
- `docs/codebase-audit/**`: Current architecture validation and cleanup reports.
- Academic presentation files: `CSE2027-MasterDatabase.xlsx`, `PROJECT_WORK_PROGRESS_DIARY_WEEK_1_TO_12.pdf`, `SMARTCAMPUS_AI_FULL_WEEKLY_PROJECT_REPORT.pdf`.

### Category 6: Generated or Reproducible
- `apps/api/dist/**`: Compiled NestJS JavaScript output (gitignored).
- `apps/web/.next/**`: Compiled Next.js build bundle (gitignored).
- `node_modules/**`: Installed NPM dependencies.
- `.pytest_cache/**`: Pytest execution cache.

### Category 7: Confirmed Redundant
- `.DS_Store` files: macOS Finder metadata files (safely cleaned).

### Category 8: Confirmed Unused
- None identified that can be safely removed without breaking operational tooling or tests.

### Category 9: Uncertain / Roadmap Retained
- `apps/ai-brain/`: Early decentralized copilot scaffolding (retained; no runtime interference).
- `apps/mlops/`: Experimental retraining pipeline (retained).
- `src/`: Early standalone prototype pipeline referenced by `scripts/run_pipeline.py` and `tests/test_pipeline.py` (retained).
