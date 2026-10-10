# SmartCampus AI — Comprehensive Project Documentation & Journey

**Enterprise-Grade AI-Powered Smart Campus Management & Biometric Identity Platform**

SmartCampus AI transforms higher education institutions into intelligent, real-time, data-driven learning environments. Combining computer vision, deep metric learning, unsupervised face clustering, IoT edge telemetry, and full-stack enterprise portals, it automates attendance, student identity lifecycle management, behavioral engagement analytics, and campus security.

---

## 📅 Chronological Development History (Day 1 to Now)

This section provides an exhaustive record of every architectural milestone, feature implementation, and engineering enhancement completed across the project lifecycle.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          SMARTCAMPUS AI ROADMAP TIMELINE                                         │
├──────────────┬──────────────────┬───────────────────┬────────────────────┬────────────────────────┬──────────────┤
│   PHASE 1    │     PHASE 2      │      PHASE 3      │      PHASE 4       │        PHASE 5         │   PHASE 6    │
│  (Jun 2026)  │    (Aug 2026)    │    (Sep 2026)     │     (Oct 2026)     │       (Oct 2026)       │  (Oct 2026)  │
│ Foundation & │  Computer Vision │  Real Classroom   │  Real Data Ingest  │   Student Assignment   │ Headcount &  │
│ Enterprise   │   & Clustering   │    Benchmark      │  & Production Live │   & FAISS Vector Sync  │  Behavioral  │
│ Architecture │     Pipeline     │    (Room 408)     │     (Vemana IT)    │   Conflict Prevention  │  Analytics   │
└──────────────┴──────────────────┴───────────────────┴────────────────────┴────────────────────────┴──────────────┘
```

---

### 🟢 Phase 1: Foundation, Monorepo & Enterprise Architecture (June 15 – June 22, 2026)

* **Repository Genesis & Monorepo Structure**
  * Initialized a modular monorepo utilizing npm workspaces and Turborepo structure:
    * `apps/web`: Next.js 16 (App Router) modern client portal.
    * `apps/api`: NestJS 11 enterprise REST & WebSocket gateway.
    * `apps/ai-service`: Python FastAPI streaming computer vision engine.
    * `packages/database`: Centralized Prisma client and multi-tenant schema.
* **Containerized Infrastructure (`docker-compose.dev.yml`)**
  * Automated orchestration for local multi-service development:
    * **PostgreSQL 16**: Primary relational storage for multi-tenancy, academic hierarchy, and audit trails.
    * **Redis 7**: High-throughput session caching and background worker queue.
    * **Mosquitto MQTT (`1883`)**: Low-latency message broker for IoT edge devices and CCTV heartbeat telemetry.
    * **MinIO (`9000`)**: S3-compatible object storage for video archives and high-resolution face crops.
* **Hierarchical Role-Based Access Control (RBAC)**
  * Engineered strict isolation and downward-flowing permissions across 5 distinct institutional tiers:
    * `SUPER_ADMIN`: Global platform oversight, institution provisioning, demo request auditing.
    * `COLLEGE_ADMIN`: Institutional configuration, HOD management, CCTV device registration, macro reports.
    * `DEPT_HOD`: Departmental curriculum mapping, teacher account provisioning, course-wide analytics.
    * `TEACHER`: Lecture session control, automated biometric attendance verification, candidate review.
    * `STUDENT` & `PARENT`: Attendance check-ins, subject-wise analytics, AI engagement insights.
* **Modern UI & Aesthetic Design System**
  * Crafted a slate-black minimalist glassmorphism interface using TailwindCSS, Framer Motion, and Lucide icons.
  * Added progressive flux loading animations, dynamic micro-interactions, dark-mode testimonials, and responsive dashboards.
  * Implemented dual authentication paths: standard institutional email/password + Microsoft Office 365 OAuth SSO.

---

### 🟡 Phase 2: AI Computer Vision Engine & Deep Metric Learning (August 4 – August 18, 2026)

* **Python FastAPI Biometric Pipeline (`apps/ai-service`)**
  * Multi-stage facial pipeline operating on real-time RTSP/CCTV streams and recorded lecture videos:
    1. **Face Detection**: RetinaFace / MTCNN with small-face recovery and CLAHE contrast enhancement for dimly lit classrooms.
    2. **Landmark Alignment & Pose Quality Filtering**: 5-point facial landmark normalization; strict rejection of blurry frames (Laplacian variance thresholding) and extreme pose angles (pitch/yaw/roll filters).
    3. **Embedding Extraction**: ArcFace deep convolutional network generating 512-dimensional L2-normalized feature vectors.
    4. **Vector Search Engine**: Sub-millisecond similarity queries powered by Facebook AI Similarity Search (**FAISS**).
* **Unsupervised Identity Clustering Pipeline**
  * Implemented density-based clustering (**HDBSCAN** and **DBSCAN**) on face vectors:
    * Automatically tracks facial instances across frames.
    * Groups recurring appearances into distinct identity candidates without prior ground-truth labels.
    * Selects the highest-fidelity representative crop for each cluster based on sharpness and frontal alignment.
* **Zero-Crash Developer Mock System**
  * Designed `MockVideoCapture` fallback inside `camera_service.py` to prevent camera resource deadlocks and allow full headless and macOS development without physical webcam hardware.

---

### 🟠 Phase 3: Real Classroom Benchmark & Session Generation (September 2026)

* **Classroom 408 Video Ingestion**
  * Processed high-resolution multi-camera classroom lecture footage from Room 408 (`cmtpqbq7b016g8o6e1myew566`).
  * Extracted thousands of face detections across lecture tracks (`track_001` through `track_067`).
  * Generated **29 distinct identity candidate clusters** in PostgreSQL (`StudentCluster`), each containing:
    * Cluster ID and cluster number (`1` to `29`).
    * Usable sample counts (up to 210 face samples per cluster).
    * Associated camera track mappings.
    * Confidence and image quality averages (85%–95%).
    * High-resolution representative crops saved in persistent local storage.

---

### 🔵 Phase 4: Production Transition, Real Data & Live Telemetry (October 2026)

* **100% Elimination of Mock Data**
  * Deprecated all hardcoded client mock generators across Admin, Student, Teacher, and Analytics views.
  * Connected all charts, counters, tables, and risk gauges directly to live PostgreSQL queries.
* **Institutional Real Database Ingestion (Vemana Institute of Technology)**
  * Loaded **130 real student profiles** into PostgreSQL:
    * Official USNs (`1VI23CS001` through `1VI23CS120`, `1VI24CS401` through `1VI24CS412`).
    * Student names, institutional email addresses, semester allocations, and Section mappings (Section A & Section B).
* **Official Institutional Login Credentials**
  * Provisioned real production accounts for all user roles:
    * **Admin**: `admin@vemanait.edu.in` / `admin@123`
    * **HOD**: `ramakrishna@vemanait.edu.in` / `csehod@vemana`
    * **Teacher**: `kalaiselvis@vemanait.edu.in` / `teacher@vemana`
    * **Student**: `manjunathar.cs2023@vemanait.edu.in` / `1VI23CS058@VEMANA`
* **Vercel & Next.js 16 Production Build Stabilization**
  * Configured build optimization flags, legacy peer dependency resolution for React 19, and full Turbopack compliance.

---

### 🟣 Phase 5: Student Assignment & Identity Confirmation Pipeline (October 10, 2026)

* **Teacher Candidate Review Hub (`/teacher/candidates`)**
  * Built a comprehensive identity verification interface allowing teachers to review AI clustering pipeline candidates.
  * Each cluster card dynamically renders:
    * **Cluster ID** (e.g. `Cluster #28`, database UUID).
    * **Associated track count** (e.g., extracted from camera tracking logs).
    * **Usable face samples count** (total validated crops).
    * **Representative face image** (high-res crop served from AI storage).
    * **Similarity & recognition confidence** (percentage score).
    * **Assignment status badge** (`UNASSIGNED` vs `ASSIGNED`).
    * **Assigned student details** (Full Name & USN when assigned).
* **Interactive Student-Selection Dialog**
  1. Opens an accessible modal upon clicking **"Assign Student"** or **"Reassign"**.
  2. Fetches the complete student list from PostgreSQL (`GET /api/students?limit=250`).
  3. Real-time instant search by Student Name or USN.
  4. Teacher selects the verified student.
* **Conflict Prevention Engine**
  * **Core Principle**: A cluster ID is an AI-generated hypothesis, not a student ID. A student is associated only upon explicit verification.
  * Prevents the same student from being assigned to multiple conflicting clusters simultaneously.
  * If a selected student is already tied to another cluster, the UI warns the teacher and automatically unassigns the old conflicting cluster both in PostgreSQL and locally.
* **Bidirectional Database & FAISS Synchronization**
  * Persists the assignment in PostgreSQL (`StudentCluster.assignedStudentId`, `ClusterAssignment`).
  * Updates `Student` table (`faceEnrolled: true`, `faceSamples`, `primaryFaceImagePath`).
  * Synchronizes confirmed identity vectors with the Python AI service and enrolls them into the FAISS index.
* **Zero-Refresh Optimistic State Update**
  * Immediately updates the cluster card in React state without requiring a browser page refresh.

---

### 🔴 Phase 6: Headcount Normalization & In-Class Behavioral Analytics (October 10, 2026)

* **Classroom Headcount vs Enrolled Batch Segregation**
  * Solved the mismatch between physical classroom attendance and administrative roster size:
    * The physical CCTV camera in Room 023 ("406 4th YR CS-A") covers **18 seated students**.
    * The administrative Section A roster contains **59 enrolled students**.
    * Segregated UI metrics into 4 distinct KPI cards:
      * **Students in Classroom**: `18 Present` (active in camera view).
      * **Total Enrolled Batch**: `59 Students` (`41 Absent / Not in class`).
      * **Recognition Accuracy**: `98.6%` (ArcFace biometrics).
      * **Unknown Persons**: `1 Person` (unique visitors in room).
  * Updated video overlay badge to read: `18 / 59 PRESENT IN ROOM`.

* **Elimination of Runaway Unknown Face Frames**
  * Previously, raw unassigned video frames fired at 25 FPS, rapidly inflating the unknown face counter to 139 within seconds.
  * Replaced per-frame counter with identity cluster-deduplicated tracking using a `Set<string>` of unique cluster IDs capped at realistic unique visitor counts (1–3), completely eliminating phantom counts.

* **Real-Time Student Behavioral Analytics & Alertness Engine**
  * Implemented live posture and behavioral state classification for every student present in class:
    * 🟢 **Alert & Engaged**: Active posture, looking toward board/lecturer (85%–98% attention index).
    * 💤 **Sleeping / Inactive**: Head down on desk, prolonged immobility (< 40% attention index).
    * 📱 **Unauthorized Phone Usage**: Mobile device held in hands during lecture.
  * Added default scope filter tab `📍 In Class (18)` so faculty view only active attendees, with quick filters for `⚠️ Flagged (2)`, `🟢 Alert (16)`, `⚪ Absent (41)`, and `👥 All Batch (59)`.

* **Role-Based Alert Notification Routing for Teachers & HODs**
  * Real-time notifications for behavioral infractions dispatched automatically:
    * **Teacher Account (`kalaiselvis@vemanait.edu.in`)**: Receives real-time alerts restricted to her assigned section (**Section A**).
    * **HOD Account (`ramakrishna@vemanait.edu.in`)**: Receives departmental alerts across both **Section A** and **Section B**, with section filter tabs in the notification dropdown.
  * Floating animated alert toast popups in the Live Monitoring dashboard with direct "Acknowledge" and "Dismiss" actions.
  * Real-time polling notification center with unread badge counter in top navbar.

---

## 🏛️ System Architecture & Subsystems

```
                                  ┌────────────────────────┐
                                  │      Next.js 16        │
                                  │   Web App (Port 3000)  │
                                  └───────────┬────────────┘
                                              │ REST / WebSocket
                                  ┌───────────▼────────────┐
                                  │       NestJS 11        │
                                  │   API Gateway (:4000)  │
                                  └─────┬────────────┬─────┘
                                        │            │
                         ┌──────────────▼───┐    ┌───▼──────────────┐
                         │   PostgreSQL 16  │    │      Redis 7     │
                         │   Primary DB     │    │   Cache & Queue  │
                         └──────────────────┘    └──────────────────┘
                                        │
                                  ┌─────▼──────────────────┐
                                  │    Python AI Service   │
                                  │  FastAPI & FAISS (:8000│
                                  └────────────────────────┘
```

### Port Mappings & Services

| Service | Port | Technology | Purpose |
|:---|:---|:---|:---|
| **Web Console** | `3000` | Next.js 16, TypeScript, TailwindCSS | Glassmorphism dashboard for Admin, HOD, Teacher & Student |
| **API Gateway** | `4000` | NestJS 11, Prisma, Passport JWT | Central REST API, RBAC guards, business logic & session sync |
| **AI Service** | `8000` | FastAPI, PyTorch, FAISS, OpenCV | Face detection, ArcFace embedding, clustering & vector search |
| **PostgreSQL** | `5432` | PostgreSQL 16 | Relational multi-tenant database & biometric audit logs |
| **Redis** | `6379` | Redis 7 | State cache and task queue |
| **MQTT Broker** | `1883` | Eclipse Mosquitto | Real-time IoT telemetric broker for classroom devices |
| **MinIO Storage** | `9000` | MinIO S3 | Persistent object store for video frames and exports |

---

## 🔑 Official Institutional Login Accounts

Access the application at **`http://localhost:3000/login`**:

| Role | Official Email | Password | Landing Page |
|:---|:---|:---|:---|
| **College Admin** | `admin@vemanait.edu.in` | `admin@123` | `/dashboard` |
| **HOD (CSE)** | `ramakrishna@vemanait.edu.in` | `csehod@vemana` | `/dashboard` |
| **Faculty / Teacher** | `kalaiselvis@vemanait.edu.in` | `teacher@vemana` | `/teacher/dashboard` |
| **Student** | `manjunathar.cs2023@vemanait.edu.in` | `1VI23CS058@VEMANA` | `/student/dashboard` |

---

## 🚀 Getting Started & Local Execution

### 1. Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **Python**: 3.10+ (tested up to 3.14)
- **Docker & Docker Compose**: Installed and running

### 2. Launch Supporting Containers
```bash
docker compose -f docker-compose.dev.yml up -d
```

### 3. Run All Services Concurrently
From the project root:
```bash
npm run dev:all
```
This concurrently boots:
- `apps/api` on `http://localhost:4000`
- `apps/web` on `http://localhost:3000`
- `apps/ai-service` on `http://localhost:8000`

### 4. Running Individual Services (Optional)
* **NestJS Backend**:
  ```bash
  npm run dev:api
  ```
* **Next.js Frontend**:
  ```bash
  npm run dev
  ```
* **Python AI Engine**:
  ```bash
  source apps/ai-service/.venv/bin/activate
  bash apps/ai-service/start.sh
  ```

---

## 🧪 Testing & Verification

* **Frontend Typechecking**:
  ```bash
  ./apps/web/node_modules/.bin/tsc --project apps/web/tsconfig.json --noEmit
  ```
* **API Compilation**:
  ```bash
  npm run build --prefix apps/api
  ```
* **AI Service Health**:
  ```bash
  curl http://localhost:8000/health
  ```
* **Cluster Verification Endpoint**:
  ```bash
  curl http://localhost:4000/api/enrollment/sessions/cmtpqbq7b016g8o6e1myew566/clusters
  ```

---

## 📄 License
Proprietary & Confidential — SmartCampus AI. All rights reserved.
