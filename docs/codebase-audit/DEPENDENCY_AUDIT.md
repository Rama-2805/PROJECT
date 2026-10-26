# Dependency Audit & Manifest Analysis — SmartCampus AI

This document audits all package manifests, third-party libraries, runtime frameworks, and build tooling across the SmartCampus AI ecosystem.

---

## 1. Frontend Dependencies (`apps/web/package.json`)

### Core Framework & UI Runtime
- **Next.js**: `16.2.9` (App Router, Turbopack support)
- **React**: `19.2.4` (React 19 Server Components & Actions)
- **React DOM**: `19.2.4`
- **Tailwind CSS**: `4.x` (Modern CSS engine via `@tailwindcss/postcss`)
- **Framer Motion**: `12.40.0` (Animations & transitions)
- **Three.js Ecosystem**: `three@^0.170.0`, `@react-three/fiber@^9.6.1`, `@react-three/drei@^10.7.7`, `@react-three/postprocessing@^2.19.1` (Utilized for 3D Digital Twin and Campus Visualization components)
- **State Management & Data**: `zustand@^5.0.14`, `zod@^4.4.3`, `react-hook-form@^7.78.0`
- **Real-Time Client**: `socket.io-client@^4.8.3`

### Dependency Health & Risks
- **Multiple Lockfile Warning**: Next.js detects both root `package-lock.json` and `apps/web/package-lock.json`. This causes Turbopack root ambiguity warnings during build.
- **`next-auth`**: Installed (`^4.24.14`), but the application primarily uses custom JWT / Zustand state management rather than NextAuth OAuth handlers.
- **ESLint 9 Flat Config Transition**: `@eslint/eslintrc` and `eslint-config-next@16.2.9` configured, generating 510 problems largely due to strict TypeScript any-checks and React 19 hook lifecycle enforcement.

---

## 2. Backend Dependencies (`apps/api/package.json`)

### Core Platform & ORM
- **NestJS Platform**: `@nestjs/core@^11.0.1`, `@nestjs/common@^11.0.1`, `@nestjs/platform-express@^11.0.1`
- **Prisma ORM**: `prisma@^7.8.0`, `@prisma/client@^7.8.0`, `@prisma/adapter-pg@^7.8.0`
- **PostgreSQL Driver**: `pg@^8.21.0`
- **Authentication & Security**: `argon2@^0.44.0` (Argon2id hashing), `@nestjs/jwt@^11.0.2`, `passport-jwt@^4.0.1`, `cookie-parser@^1.4.7`
- **Rate Limiting & Protection**: `@nestjs/throttler@^6.5.0`
- **Real-Time Gateway**: `@nestjs/websockets@^11.1.27`, `@nestjs/platform-socket.io@^11.1.26`, `socket.io@^4.8.3`

### Dependency Health & Risks
- **TypeScript 5.x Compatibility**: `@types/node@^24.0.0` and `@types/express@^5.0.0` are installed, providing modern type definitions.
- **Strict Linting Gap**: 994 ESLint problems arise primarily from `@typescript-eslint/no-explicit-any` across controllers, services, and DTOs.

---

## 3. Python AI Service Dependencies (`apps/ai-service/requirements.txt`)

### Deep Learning & Computer Vision
- **Inference Engine**: `onnxruntime==1.19.2`, `torch==2.8.0`
- **Face Detectors**: `insightface==0.7.3`, `ultralytics==8.4.116` (YOLO26-Face model execution)
- **Computer Vision**: `opencv-python==4.10.0.84`, `opencv-python-headless==4.10.0.84`, `Pillow==10.4.0`
- **Vector Search & Clustering**: `faiss-cpu>=1.7.0`, `hdbscan==0.8.39`, `scikit-learn==1.5.2`, `numpy==1.26.4`
- **API Server**: `fastapi==0.115.0`, `uvicorn[standard]==0.30.6`, `pydantic==2.9.2`
- **Background Tasks**: `celery==5.4.0`, `redis==5.1.1`
- **Database Fallback**: `SQLAlchemy>=2.0.0`, `psycopg2-binary>=2.9.0`
- **Cryptography**: `cryptography>=42.0.0` (AES-256-GCM camera credential encryption)

### Dependency Health & Risks
- **Dual OpenCV Packages**: Both `opencv-python` and `opencv-python-headless` are pinned. In headless Docker environments, having both can occasionally cause font rendering warnings, though no build breakages occur.
- **Celery Idle Dependency**: Celery is installed and pinned, but not actively wired to task queues in code.
- **Apple Silicon / macOS Acceleration**: `onnxruntime-gpu` is correctly guarded with `; sys_platform != "darwin"`.

---

## 4. Root & Auxiliary Manifests

- **Root `package.json`**: Lightweight orchestrator using `concurrently@^8.2.2` and `cross-env@^7.0.3` to run all services simultaneously via `npm run dev:all`.
- **`apps/edge-agent/requirements.txt`**: Minimal requirements (`opencv-python-headless`, `requests`, `python-dotenv`) for edge camera forwarder.
- **`apps/mlops/pipelines/requirements.txt`**: Standard MLOps dependencies (`mlflow`, `scikit-learn`, `boto3`).
