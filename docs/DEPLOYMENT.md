# SmartCampus AI — Production Deployment Guide

## System Requirements

### Minimum (Development/Laptop)
- 8GB RAM, 4 CPU cores
- Docker Desktop 24+
- 20GB free disk space

### Recommended (Production)
- 32GB RAM, 8 CPU cores
- Docker 24+ on Linux
- 100GB SSD + 500GB storage
- PostgreSQL 16 with replication
- Load balancer (NGINX/Traefik)

### Scaling (Multi-Institution)
- 64GB+ RAM, 16+ CPU cores
- Database cluster with read replicas
- Redis cluster
- Multiple AI worker nodes

---

## Deployment Options

### Option 1: Docker Compose (Single Server)

```bash
# 1. Prepare environment
cp .env.production .env
# Edit .env with your production values

# 2. Initialize database
docker compose up -d postgres
docker compose run --rm api npx prisma migrate deploy

# 3. Start all services
docker compose --env-file .env -f docker-compose.yml up -d

# 4. Verify deployment
curl http://localhost:4000/api/health
curl http://localhost:3000/health
```

### Option 2: Docker Swarm (Multi-Server)

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml smartcampus
```

### Option 3: Kubernetes (Cloud)

```bash
# Apply manifests
kubectl apply -f deploy/k8s/namespace.yml
kubectl apply -f deploy/k8s/
```

---

## Environment Configuration

### Required Secrets

| Variable | Source | Example |
|----------|--------|---------|
| `POSTGRES_PASSWORD` | Generated | `openssl rand -hex 32` |
| `JWT_SECRET` | Generated | `openssl rand -hex 64` |
| `JWT_REFRESH_SECRET` | Generated | `openssl rand -hex 64` |
| `ENCRYPTION_KEY` | Generated | `openssl rand -hex 16` |
| `MINIO_ROOT_PASSWORD` | Generated | `openssl rand -hex 16` |

---

## Database Migration

```bash
# Generate migration
cd api
npx prisma migrate dev --name add_new_model

# Apply to production
npx prisma migrate deploy

# Reset (careful!)
npx prisma migrate reset --force
```

---

## Backup & Recovery

### Automated Backups

```bash
# Add to cron: daily at 2 AM
0 2 * * * /opt/smartcampus/scripts/backup.sh

# Backup to S3
S3_BACKUP_BUCKET=smartcampus-backups ./scripts/backup.sh
```

### Disaster Recovery

1. **Database failure** — Restore from latest backup
2. **Service crash** — Docker restart policy auto-restarts
3. **Full server failure** — Deploy to new server, restore DB + storage
4. **Data corruption** — Point-in-time recovery from WAL archive

**RPO:** 1 hour | **RTO:** 30 minutes

---

## Scaling

### Vertical Scaling
- Increase Docker resource limits
- Add more RAM and CPU to database

### Horizontal Scaling
```bash
# Scale API instances
docker compose up -d --scale api=3

# Scale AI workers
docker compose up -d --scale ai-worker=4
```

### Database Scaling
- Add read replicas for analytics queries
- Implement connection pooling (PgBouncer)
- Partition large tables by institution

---

## Health Checks

| Service | Endpoint | Expected |
|---------|----------|----------|
| API | `/api/health` | `{ "status": "ok" }` |
| Web | `/health` | `200 OK` |
| AI Engine | `/health` | `{ "status": "healthy" }` |
| PostgreSQL | `pg_isready` | `accepting connections` |
| Redis | `redis-cli ping` | `PONG` |
