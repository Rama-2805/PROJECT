# SmartCampus AI — Developer Setup Guide

## Prerequisites

- **Node.js** 20+ (recommended: 20 LTS via nvm)
- **Python** 3.12+
- **Docker** 24+ & Docker Compose
- **PostgreSQL** 16 (or use Docker)
- **Git**

## Initial Setup

### 1. Clone & Install

```bash
git clone <repository-url>
cd smart-campus-ai

# Install API dependencies
cd apps/api
npm ci

# Install Web dependencies
cd ../web
npm ci

# Install AI service dependencies
cd ../ai-service
pip install -r requirements.txt
```

### 2. Environment Configuration

```bash
cd ../..
cp .env.development .env
```

### 3. Database Setup

```bash
# Start PostgreSQL via Docker
docker compose up -d postgres

# Run migrations
cd apps/api
npx prisma migrate dev

# Seed demo data (if available)
npx prisma db seed
```

### 4. Start Development Servers

```bash
# Terminal 1: Backend API
cd apps/api
npm run start:dev

# Terminal 2: Frontend
cd ../web
npm run dev

# Terminal 3: AI Service (optional)
cd ../ai-service
uvicorn app.main:app --reload --port 8000

# Terminal 4: Edge Agent Simulator (optional)
cd ../edge-agent
python -m app.simulator --simulate 5
```

The app is now running at:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:4000
- **API Health:** http://localhost:4000/api/health
- **AI Service:** http://localhost:8000
- **AI Health:** http://localhost:8000/health
- **PostgreSQL:** localhost:5432
- **MinIO Console:** http://localhost:9001

---

## Project Structure

```
smart-campus-ai/
├── apps/
│   ├── api/              # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/     # Authentication & JWT
│   │   │   ├── common/   # Guards, decorators, interceptors
│   │   │   ├── security/ # Encryption, audit, security guards
│   │   │   ├── privacy/  # Biometric privacy controls
│   │   │   └── ...       # Domain modules
│   │   └── prisma/       # Database schema & migrations
│   ├── web/              # Next.js frontend
│   │   └── src/
│   │       ├── app/      # App Router pages
│   │       ├── components/ # Reusable UI components
│   │       └── lib/      # Utilities & mock data
│   ├── mobile/           # Expo React Native app
│   ├── ai-service/       # Python AI microservice
│   ├── ai-brain/         # Python AI agent brain
│   ├── edge-agent/       # Edge device simulator
│   └── mlops/            # MLOps pipeline modules
├── packages/
│   └── shared/           # Shared TypeScript library
├── deploy/
│   └── monitoring/       # Prometheus & Grafana configs
├── .github/workflows/    # CI/CD pipelines
├── scripts/              # Database & backup utilities
└── docs/                 # Documentation
```

---

## Common Commands

### API

```bash
cd apps/api
npm run start:dev        # Start dev server (watch mode)
npm run build            # Build for production
npm test                 # Run unit tests
npm run lint             # Lint code
npx prisma studio        # Open Prisma Studio
npx prisma migrate dev   # Create migration
npx prisma migrate deploy # Apply migration
```

### Web

```bash
cd apps/web
npm run dev              # Start dev server
npm run build            # Build for production
npm run lint             # Lint code
npx tsc --noEmit         # Type check only
```

### AI Service

```bash
cd apps/ai-service
uvicorn app.main:app --reload --port 8000
pytest tests/            # Run tests
```

### Edge Agent

```bash
cd apps/edge-agent
python -m app.simulator --simulate 10
python -m app.simulator --device-id DEVICE_TEST_001
```

---

## Type Checking

```bash
# Frontend
cd apps/web && npx tsc --noEmit

# Backend
cd apps/api && npx tsc --noEmit

# Both (from root, requires concurrently)
npx concurrently "cd apps/web && npx tsc --noEmit" "cd apps/api && npx tsc --noEmit"
```

---

## Testing

```bash
# API unit tests
cd apps/api && npm test

# API with coverage
cd apps/api && npm run test:cov

# E2E tests
cd apps/api && npm run test:e2e
```

---

## Debugging

### API Debug Mode

```bash
cd apps/api
npm run start:debug
# Attach debugger at chrome://inspect or IDE
```

### Frontend Debug

- Next.js dev server includes React DevTools
- Use browser DevTools for network/state inspection
- Redux DevTools for Zustand state

### Database Debug

```bash
# View Prisma queries in console
export DEBUG="prisma:query"
npm run start:dev

# Open Prisma Studio
npx prisma studio
```

---

## Troubleshooting

### Prisma Client Errors

```bash
cd apps/api
npx prisma generate
```

### Port Already in Use

```bash
# Find process on port
npx kill-port 4000 3000 8000
# Or manually
lsof -i :4000
kill -9 <PID>
```

### Docker Issues

```bash
# Reset Docker services
docker compose down -v
docker compose up -d

# Rebuild images
docker compose build --no-cache api web
```

### Node Modules Issues

```bash
# Clean install
rm -rf node_modules package-lock.json
npm ci
```

### Python Issues

```bash
cd apps/ai-service
pip install --upgrade -r requirements.txt
```
