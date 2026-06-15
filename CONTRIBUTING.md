# Contributing to SmartCampus AI

Thank you for considering contributing to SmartCampus AI! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/smart-campus-ai.git
   ```
3. Set up the development environment:
   ```bash
   cp .env.development .env
   cd api && npm ci
   cd ../web && npm ci
   cd ../apps/ai-service && pip install -r requirements.txt
   ```
4. Create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Code Style

- **TypeScript/JavaScript**: Use Prettier for formatting, ESLint for linting
- **Python**: Follow PEP 8, use Black for formatting
- **Commit Messages**: Use conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, etc.)

### Before Submitting

1. Run type checking:
   ```bash
   cd api && npx tsc --noEmit
   cd web && npx tsc --noEmit
   ```
2. Run linting:
   ```bash
   cd api && npm run lint
   cd web && npm run lint
   ```
3. Run tests:
   ```bash
   cd api && npm test
   ```

## Pull Request Process

1. Ensure your code passes all CI checks
2. Update documentation if needed
3. Add tests for new features
4. Create a pull request with a clear description of changes
5. Request review from maintainers

## Project Structure

```
smart-campus-ai/
├── api/              # NestJS backend
├── web/              # Next.js frontend
├── apps/
│   ├── ai-service/   # Python AI microservice
│   └── edge-agent/   # Edge device simulator
├── docs/             # Documentation
├── scripts/          # Utility scripts
└── monitoring/       # Prometheus/Grafana config
```

## Questions?

Open a [GitHub Discussion](https://github.com/smartcampus-ai/discussions) or reach out to the maintainers.
