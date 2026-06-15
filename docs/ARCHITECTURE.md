# SmartCampus AI — Architecture Documentation

## System Overview

SmartCampus AI is a multi-tenant, edge-computing AI platform for smart campus management. It provides face recognition-based attendance, behavioral analytics, IoT device management, and comprehensive analytics — all in real time.

---

## Technology Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **UI:** Tailwind CSS 4 + Framer Motion
- **State:** Zustand + React Hook Form
- **Real-time:** WebSocket (native browser API)

### Backend API
- **Framework:** NestJS 11
- **Language:** TypeScript
- **Database:** PostgreSQL 16 via Prisma ORM
- **Cache:** Redis 7
- **Auth:** JWT + RBAC

### AI Service
- **Framework:** FastAPI (Python 3.12)
- **Face Recognition:** InsightFace ArcFace
- **Pose Detection:** MediaPipe
- **Background Tasks:** Celery + Redis
- **Clustering:** HDBSCAN / scikit-learn

### Edge & IoT
- **Edge Simulator:** Python asyncio
- **Messaging:** MQTT (Mosquitto)
- **Storage:** MinIO (S3-compatible)
- **Offline:** SQLite buffer

---

## Data Flow

### Real-Time Attendance

```
Camera → Edge Agent → Frame Extraction → Face Detection
    ↓
ArcFace Embedding → Cosine Similarity → Student Match
    ↓
Temporal Verification (3 frames) → Attendance Decision
    ↓
MQTT Publish → WebSocket → Live Dashboard
```

### AI Enrollment Pipeline

```
Classroom Video → Frame Extraction (0.5s) → Blur Detection
    ↓
Face Detection (RetinaFace) → Embedding (ArcFace 512D)
    ↓
HDBSCAN Clustering → Teacher Review → Student Assignment
    ↓
Face Database (Encrypted PostgreSQL)
```

---

## Multi-Tenant Architecture

```
┌────────────────────────────────────────────────┐
│                   Institution                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │ Users   │ │Students │ │Teachers │            │
│  └─────────┘ └─────────┘ └─────────┘            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │Depts    │ │Courses  │ │Subjects │            │
│  └─────────┘ └─────────┘ └─────────┘            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │Classrooms││Devices  │ │Edge Nodes│           │
│  └─────────┘ └─────────┘ └─────────┘            │
└────────────────────────────────────────────────┘
         ↑                         ↑
    Row-Level Security      Separate Database
    (Institution ID)        (Premium Tier)
```

Every table with `institutionId` has Row-Level Security enabled.
Premium institutions can opt for dedicated database instances.

---

## Security Architecture

```
┌─ Internet ─────────────────────────────────────┐
│                                                 │
│  HTTPS ─▶ CDN ─▶ Load Balancer ─▶ WAF          │
│                        │                        │
│           ┌────────────┴────────────┐            │
│           │    API Gateway (NestJS)  │            │
│           └────────────┬────────────┘            │
│                        │                         │
│           ┌────────────┴────────────┐            │
│           │   Security Layer        │            │
│           │  ┌──────────────────┐   │            │
│           │  │ JWT Verification │   │            │
│           │  │ RBAC Check       │   │            │
│           │  │ Rate Limiting    │   │            │
│           │  │ Audit Logging    │   │            │
│           │  │ Request Validation│  │            │
│           │  └──────────────────┘   │            │
│           └────────────┬────────────┘            │
└──────────────────────────────────────────────────┘
```

---

## Database Schema (Core Models)

```
Institution (multi-tenant root)
  ├── User (with role assignments)
  ├── Department
  │   ├── Teacher
  │   ├── Student
  │   └── Classroom
  ├── Course → Subject
  ├── Device (edge nodes with heartbeats)
  ├── FaceEmbedding (encrypted biometrics)
  ├── AttendanceSession → AttendanceRecord
  ├── BehaviorEvent → EngagementRecord → BehaviorAlert
  └── AnalyticsSnapshot → StudentRiskProfile
```

---

## Module Map

| Module | Files | Endpoints |
|--------|-------|-----------|
| Auth | 8 | Login, refresh, register, profile |
| Users | 4 | CRUD + roles |
| Students | 6 | CRUD + stats + import |
| Departments | 4 | CRUD + analytics |
| Classrooms | 4 | CRUD + devices |
| Courses | 4 | CRUD + enrollment |
| Teachers | 4 | CRUD + schedule |
| Subjects | 4 | CRUD + assignments |
| Enrollment | 4 | Jobs + clusters + embeddings |
| Attendance | 4 | Sessions + records + live |
| Behavior | 4 | Events + engagement + alerts |
| IoT | 4 | Devices + heartbeats + commands + models |
| Analytics | 4 | Overview + risk + departments + AI |
| Reports | 4 | Generate + history + schedule |
| Privacy | 3 | Data access + deletion + export |
| Security | 3 | Encryption + audit + guards |
