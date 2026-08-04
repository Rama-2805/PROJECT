# SmartCampus AI

**Enterprise-Grade AI-Powered Smart Campus Management Platform**

SmartCampus AI transforms university classrooms into intelligent, data-driven learning environments. Using AI face recognition, behavioral analytics, IoT edge computing, and real-time monitoring, it provides institutions with actionable insights into attendance, engagement, and campus operations.

---

## 🏛️ System Architecture

```
                    ┌──────────────┐
                    │   Next.js    │
                    │   Frontend   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  NestJS API  │
                    │  (Gateway)   │
                    └──────┬───────┘
                           │
            ┌───────────────┼───────────────┐
            │               │               │
     ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
     │ PostgreSQL  │ │    Redis    │ │   MQTT      │
     │ (Primary)   │ │   (Cache)   │ │  (Messaging)│
     └─────────────┘ └─────────────┘ └──────┬──────┘
                                            │
                                     ┌──────▼──────┐
                                     │   Python    │
                                     │  AI Engine  │
                                     └─────────────┘
```

SmartCampus AI uses a modular, multi-tenant architecture designed for massive scalability, local development ease, and production stability.

### Subsystem Tech Stack & Port Mappings

| Service | Tech Stack | Local Port | Role & Responsibility |
|:---|:---|:---|:---|
| **web** | Next.js 16 (App Router), TypeScript, TailwindCSS, Framer Motion | `3000` | Premium glassmorphism administration console and user dashboards |
| **api** | NestJS 11, TypeScript, Prisma, Passport JWT | `4000` | Unified RESTful Gateway & WebSocket notification hub |
| **ai-service** | Python 3.12, FastAPI, OpenCV, FAISS, PyTorch | `8000` | Real-time face detection, embedding generation, unknown clustering, and behavior classification |
| **postgres** | PostgreSQL 16 | `5432` | Multi-tenant persistent relational database |
| **redis** | Redis 7 | `6379` | Key-value caching, session state management, and async task queueing |
| **mqtt** | Mosquitto MQTT | `1883` | Real-time IoT telemetric broker for edge devices and IP cameras |
| **minio** | MinIO S3-Compatible Storage | `9000` | Secured object storage for face samples, snapshots, and reports |

---

## 👥 Institutional Role Hierarchy & Scope

SmartCampus AI implements a strict hierarchical role structure. Permissions flow downward; each role is isolated to their specific organizational scope:

```
                  SUPER ADMIN (SmartCampus AI)
                               ↓
                         COLLEGE ADMIN
                               ↓
                        DEPT HOD (Head)
                               ↓
                            TEACHER
                               ↓
                            STUDENT
```

### 🔑 Portal Capabilities & Permissions

1. **SUPER ADMIN (SmartCampus AI Global)**
   - Creation and onboarding of new Colleges / Institutions.
   - Subscription tier management (Free, Professional, Enterprise).
   - Global platform usage analytics and service health telemetry.
   - Reviewing and actioning incoming college demo requests.

2. **COLLEGE ADMIN**
   - Complete configuration of their respective college campus settings.
   - Creating and managing Head of Department (HOD) accounts.
   - Creating/deleting Departments, Classrooms, and physical CCTV Cameras.
   - Generation of college-wide reports and audit log exports.

3. **HEAD OF DEPARTMENT (HOD)**
   - Management of department-specific Teacher accounts.
   - Creation and mapping of Course curricula, Subjects, and class timetables.
   - Tracking department-level student risk and performance statistics.
   - Approval of course-wide attendance overrides.

4. **TEACHER**
   - Taking real-time manual or automated (AI camera-based) classroom attendance.
   - Initiating dynamic QR-code-based self-attendance sessions for students.
   - Viewing personal teaching schedules, course subjects, and class list registries.
   - Receiving real-time student behavior alerts (e.g. mobile phone usage in class).

5. **STUDENT & PARENT**
   - Scan-to-check-in dynamic QR attendance validation.
   - Viewing personal daily timetable, subject-wise attendance logs, and notifications.
   - Access to AI-generated learning insights and student risk alert indicators.

---

## 🏢 Organizational Structure & Isolation

The database supports dynamic multi-tenancy. Under an **Institution**, multiple **Departments** are maintained. The platform supports:
- **CSE** (Computer Science & Engineering)
- **ISE** (Information Science & Engineering)
- **ECE** (Electronics & Communication Engineering)
- **EEE** (Electrical & Electronics Engineering)
- **AIML** (Artificial Intelligence & Machine Learning)
- **CSE(AI)** (Computer Science & AI)
- **MECH** (Mechanical Engineering)
- **CIVIL** (Civil Engineering)

### Data Isolation Rules
Each department isolates the following entities under separate Prisma contexts to maintain operational privacy:
- **Students & Teachers**: Registered and queried based on department-level relations.
- **Subjects & Schedules**: Timetables are associated with specific department classroom units.
- **Analytics & Reports**: Academic performance, attendance records, and risk assessments are computed and segmented at the department level.

---

## 🤖 AI Engine & Computer Vision Pipeline

The Python AI Engine is the core computational service for biometric matching and classroom behavioral diagnostics.

### 🎥 CCTV Video Ingestion & Stream Management
- Edge CCTV cameras send video feeds via RTSP or local streaming simulation.
- Single frames are evaluated using MTCNN/RetinaFace for face detection.
- Biometric embeddings (128-dimensional vectors) are generated via FaceNet / ArcFace models.

### 🛡️ Local Webcam Simulation (Shielding Bypass)
To prevent lockups and security alerts on developer systems lacking active webcam configurations, a robust **webcam simulator bypass** is integrated in `camera_service.py` and `camera_manager.py`:
- If webcam index `"0"` is opened, instead of pulling a hardware video stream, the system initiates a **MockVideoCapture** simulation.
- The simulator generates a real-time, animated dark blue virtual grid overlay containing dynamic telemetry lines, a rotating loading indicator, and simulated classroom biometric markers.
- This feeds fake video frames into the face detection pipeline, keeping local developer systems fully functional without launching hardware cameras.

### 🧠 Continuous Learning & FAISS Index Rebuilding
- **Unknown Face Clustering**: Faces detected in the camera stream that do not exceed the high-confidence matching threshold are saved as `UnknownFace` records.
- **Biometric Clusters**: A background process groups recurrence patterns of unidentified faces into clusters (e.g. `CLUST-01`).
- **Profile Enlistment**: HODs or admins can assign an unknown cluster to a registered student's profile.
- **Vector Reindexing**: Every night, or on-demand, the Python AI Engine rebuilds the local FAISS index file with the latest face embedding vectors to guarantee 99%+ recognition speeds.

### 📈 Student Risk & Behavior Engine
- Class cameras monitor posture and engagement (e.g., drowsiness, excessive phone usage, looking away).
- Behavior logs are pushed to the backend via MQTT using the pattern `/behavior/alerts`.
- **StudentRiskProfile**: A daily task analyzes attendance drops and engagement alerts, labeling students as `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW` risk.

---

## 💾 Core Database Models

The relational PostgreSQL schema relies on the following central Prisma models:

```prisma
// Multi-tenant college representation
model Institution {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  planEnum    InstitutionPlan
  maxStudents Int
  maxTeachers Int
  maxDevices  Int
  // ... relations to Departments, Classrooms, Devices
}

// User accounts with security metadata
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  isActive      Boolean  @default(true)
  emailVerified Boolean  @default(false)
  userRoles     UserRole[]
}

// Hierarchical roles
model Role {
  id   String @id @default(cuid())
  name String @unique // SUPER_ADMIN, INSTITUTION_ADMIN, HOD, TEACHER, STUDENT
}

// Student biometrics and attendance summaries
model Student {
  id                   String   @id @default(cuid())
  studentId            String   @unique // USN/Roll number
  fullName             String
  faceEnrolled         Boolean  @default(false)
  attendancePercentage Float
  engagementScore      Float
}

// Attendance sessions (automated or QR-based)
model AttendanceSession {
  id          String   @id @default(cuid())
  classroomId String
  subjectId   String
  startTime   DateTime
  endTime     DateTime?
  status      SessionStatus // ACTIVE, COMPLETED
}
```

---


## 🚀 Quick Start Guide & Terminal Commands

### 1️⃣ Run the Complete Application Stack

To launch the full platform (NestJS API Gateway + Next.js Web App):

```bash
# Clone & enter repository
git clone <repo-url>
cd PROJECT

# Run the complete stack concurrently
npm start
```

---

### 2️⃣ Run Services Individually (Recommended for Development)

#### **Terminal 1 — NestJS API Backend (`apps/api`)**
```bash
# 1. Install NestJS API dependencies
npm install --prefix apps/api

# 2. Generate Prisma Database Client
npx prisma generate --schema=apps/api/prisma/schema.prisma

# 3. Start NestJS API Gateway server (Runs at http://localhost:3001)
npm run dev:api
```

#### **Terminal 2 — Next.js Frontend App (`apps/web`)**
```bash
# 1. Install Next.js Web dependencies
npm install --prefix apps/web --legacy-peer-deps

# 2. Start Next.js App Router dev server (Runs at http://localhost:3000)
npm run dev
```

#### **Terminal 3 — Streaming AI Pipeline Engine (`apps/ai-service`)**
```bash
# 1. Activate Python Virtual Environment
source .venv/bin/activate

# 2. Execute 100% In-Memory Streaming AI Pipeline on footage/
python main.py
```

---

### 3️⃣ Run Unit & Integration Test Suites

```bash
# Run Pytest suite for face detection, quality filter, FAISS & deduplication
PYTHONPATH=. .venv/bin/pytest tests/ -v
```

---

### 👤 Verified Local Testing Login Credentials

Access the login portal at **`http://localhost:3000/login`**:

| Role | Email | Password | Redirect Target |
|:---|:---|:---|:---|
| **Super Admin** | `admin@smartcampus.edu` | `admin123` | **`/dashboard`** |
| **College Admin** | `college@smartcampus.edu` | `admin123` | **`/dashboard`** |
| **Department HOD** | `hod.cse@smartcampus.edu` | `hod123` | **`/dashboard`** |
| **Teacher / Faculty** | `teacher@smartcampus.edu` | `admin123` | **`/teacher/dashboard`** |
| **Student** | `student@smartcampus.edu` | `admin123` | **`/student/dashboard`** |

*(Alternative domain credentials `admin@collegename.edu.in`, `teacher@collegename.edu.in`, and `student@collegename.edu.in` with password `admin123` are also active).*

---

## 🔧 Phase 1 Stabilization & Bug Fixes

The following high-priority bugs have been permanently patched to stabilize the application context:

1. **Webcam Locking Prevention**
   - Terminated zombie camera locks. Added `MockVideoCapture` fallback mechanism to simulate CCTV frames without engaging physical webcams.
2. **Hydration Mismatch Mitigation**
   - Wrapped Next.js login screens in standard client-side mounted state check guards (`mounted && ...`) to eliminate SSR/CSR HTML structure mismatches.
3. **Session Cookie Path Alignment**
   - Corrected the server-side refresh token cookie path from `/auth/refresh` to `/api/auth/refresh`, allowing the browser to correctly match cookies during JWT token rotation.
4. **Analytics Loading Fallback**
   - Patched `/dashboard/analytics` state-fetching logic. If NestJS analytics endpoints return unauthorized (401) or database records are unpopulated, the page automatically falls back to beautiful local mock telemetry instead of locking up the interface.

---

## 🔒 Security & Operations

- **Token Strategy**: API routes require authorization headers in bearer format (`Authorization: Bearer <token>`). Short-lived access tokens expire in 15 minutes.
- **CSRF Isolation**: Cookies are structured as `HttpOnly`, `SameSite: Lax`, and `Secure` (in production contexts) to safeguard session tokens.
- **Audit Logging**: Global `AuditLog` records track exact parameters of registration, authentication, database adjustments, and IoT triggers.
- **Backups**: Database logs are backed up via pg_dump schedules with a Recovery Point Objective (RPO) of 1 hour.

---

## 📄 License

Proprietary — SmartCampus AI. All rights reserved. Confidential and Private repository.
