# SmartCampus AI

**Enterprise-Grade AI-Powered Smart Campus Management Platform**

SmartCampus AI transforms university classrooms into intelligent, data-driven learning environments. Using AI face recognition, behavioral analytics, IoT edge computing, and real-time monitoring, it provides institutions with actionable insights into attendance, engagement, and campus operations.

---

## Architecture

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

### Services

| Service | Tech | Port | Description |
|---------|------|------|-------------|
| **web** | Next.js 16 | 3000 | Premium glass UI dashboard |
| **api** | NestJS 11 | 4000 | RESTful + WebSocket backend |
| **ai-engine** | Python FastAPI | 8000 | Face recognition + behavior AI |
| **postgres** | PostgreSQL 16 | 5432 | Multi-tenant database |
| **redis** | Redis 7 | 6379 | Caching + job queue |
| **mqtt** | Mosquitto | 1883 | IoT device messaging |
| **minio** | MinIO | 9000 | Object storage |

---

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.12+
- Docker & Docker Compose (for full stack)
- PostgreSQL 16 (for local dev)

### Development Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd smart-campus-ai

# 2. Set up environment
cp .env.development .env

# 3. Start infrastructure services
docker compose up -d postgres redis minio

# 4. Install API dependencies & run migrations
cd api
npm ci
npx prisma migrate dev
npm run start:dev

# 5. Install Web dependencies & start
cd ../web
npm ci
npm run dev

# 6. (Optional) Start AI service
cd ../apps/ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**The frontend is now running at http://localhost:3000**

---

## Environment Strategy

| Environment | File | Purpose |
|-------------|------|---------|
| Development | `.env.development` | Local development |
| Staging | `.env.staging` | Pre-production testing |
| Production | `.env.production` | Live deployment |

---

## Deployment

### Docker Compose (Production)

```bash
# Start all services
docker compose --env-file .env.production up -d

# With monitoring
COMPOSE_PROFILES=monitoring docker compose --env-file .env.production up -d

# With edge simulator
COMPOSE_PROFILES=edge-simulator docker compose --env-file .env.production up -d
```

### Production Requirements

- Domain with TLS certificate
- PostgreSQL 16 with replication
- Redis 7 with persistence
- S3-compatible object storage
- Docker host with 8GB+ RAM

---

## Security

- **Zero-trust architecture** — Every request verified, every device authenticated
- **JWT authentication** — Short-lived access tokens + rotating refresh tokens
- **RBAC enforcement** — Role-based access on every endpoint
- **Row-Level Security** — Multi-tenant data isolation at database level
- **AES-256 encryption** — Encrypted face embeddings and device tokens
- **Audit logging** — Immutable trails for all security events
- **Rate limiting** — Per-IP and per-endpoint throttling
- **CORS/CSRF** — Strict origin validation

---

## Monitoring

- **Prometheus** — Metrics collection (port 9090)
- **Grafana** — Visual dashboards (port 3001, admin/admin)
- **Health checks** — Every service has `/health` endpoint
- **Structured logging** — JSON-format logs for log aggregation

---

## Backup & Recovery

```bash
# Manual backup
./scripts/backup.sh

# Automated (cron: daily at 2 AM)
0 2 * * * /opt/smartcampus/scripts/backup.sh

# Restore
pg_restore -d smartcampus -U smartcampus backups/smartcampus_20260101_020000.sql.gz
```

**RPO:** 1 hour | **RTO:** 30 minutes

---

## License

Proprietary — SmartCampus AI. All rights reserved.
