# Quick Start Guide - Backend Core Rebuild

Welcome to the wallet API backend! This guide gets you from zero to running in ~5 minutes.

## 📋 Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

## 🚀 Fast Setup (Docker Compose)

### 1. Clone the Repository
```bash
git clone <repo-url>
cd backend-core-rebuild
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env if needed (defaults work with Docker Compose)
nano .env
```

### 4. Start Services
```bash
docker-compose up
# Waits for PostgreSQL and Redis, then starts API + workers
```

In another terminal, verify:
```bash
# Check API is responding
curl http://localhost:5000/service/health

# View automation and job queues
open http://localhost:5000/admin/queues

# Explore API documentation
open http://localhost:5000/api-docs
```

## 📚 Next Steps

### Learn the Architecture
Read [CONTRIBUTING.md](CONTRIBUTING.md) → **Project Architecture** section

### Understand Key Patterns
Start with [.github/copilot-instructions.md](.github/copilot-instructions.md) to learn:
- Transaction safety and deadlock prevention
- How idempotency prevents duplicate transfers
- Background job processing with BullMQ
- Middleware chain and error handling

### Build Your First Feature
Follow [CONTRIBUTING.md](CONTRIBUTING.md) → **Adding Features** section

### Get Help from AI
Use Copilot agents for domain-specific assistance:

```
@financial-ops How do I implement a transfer endpoint safely?
```

```
@queue-handler How should I handle job failures?
```

```
@devops My container won't start, help me debug
```

See [.github/AGENTS.md](.github/AGENTS.md) for available agents and their specialties.

---

## 🛠 Common Commands

### Development
```bash
# Start everything
docker-compose up

# Start only API (not workers)
docker-compose up wallet-api

# View logs
docker-compose logs -f wallet-api

# Execute command in container
docker-compose exec wallet-api sh

# Stop everything
docker-compose down

# Full cleanup (delete volumes/data)
docker-compose down -v
```

### Local Development (without Docker)
```bash
# Make sure PostgreSQL and Redis are running locally
npm run dev
# Starts: server + refund worker + webhook worker

# Or just the API
npm start
```

### Database
```bash
# Check PostgreSQL
psql -h localhost -U wallet_user -d wallet_db

# Run migrations (if init.sql doesn't work)
psql -h localhost -U wallet_user -d wallet_db < init.sql
```

## 📁 Project Structure

```
src/
├── app.js                    # Express app setup
├── server.js                 # Server entry point
├── controllers/              # Request handling
├── services/                 # Business logic
├── routes/                   # API endpoints
├── queues/                   # Job definitions
├── workers/                  # Background processors
├── middlewares/              # Cross-cutting concerns
├── config/                   # Infrastructure setup
├── cron/                     # Scheduled tasks
└── utils/                    # Helpers

.github/
├── copilot-instructions.md   # Complete architecture guide
├── AGENTS.md                 # AI agent specializations
└── wallet-ops.instructions.md # Financial safety guidelines

.env.example                   # Environment template
CONTRIBUTING.md                # Full developer guide
docker-compose.yml             # Local development setup
Dockerfile                     # Production image
```

## 🔑 Key Files to Understand

| File | Purpose |
|------|---------|
| [src/app.js](src/app.js) | See middleware ordering |
| [src/services/wallet.service.js](src/services/wallet.service.js) | Learn transaction safety |
| [src/routes/wallet.route.js](src/routes/wallet.route.js) | See middleware stacking |
| [src/workers/refund.worker.js](src/workers/refund.worker.js) | Understand job processing |
| [.github/copilot-instructions.md](.github/copilot-instructions.md) | Read full architecture |

## ⚠️ Important Security Notes

1. **Never commit `.env`** to git (already in `.gitignore`)
2. **Use strong JWT_SECRET** (minimum 32 characters)
   ```bash
   # Generate random secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. **Secrets in production**: Use secure vault, not .env files
4. **Default PostgreSQL password** in docker-compose (`teja2026db`) is for development only

## 🐛 Troubleshooting

### API won't start
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
→ PostgreSQL not running. Run `docker-compose up postgres`

### "Cannot find module"
```
Error: Cannot find module 'bullmq'
```
→ Dependencies not installed. Run `npm install` and `docker-compose up --build`

### Port already in use
```
Error: listen EADDRINUSE :::5000
```
→ Something using port 5000. Either:
- Change PORT in `.env`
- Kill the process: `lsof -i :5000 | tail -1 | awk '{print $2}' | xargs kill`

See [CONTRIBUTING.md](CONTRIBUTING.md) → **Getting Help** for more common issues.

## 📖 Full Documentation

- **Setup & Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Architecture & Patterns**: [.github/copilot-instructions.md](.github/copilot-instructions.md)
- **Financial Safety**: [.github/wallet-ops.instructions.md](.github/wallet-ops.instructions.md)
- **AI Assistance**: [.github/AGENTS.md](.github/AGENTS.md)
- **API Docs**: Run project and visit `http://localhost:5000/api-docs`

---

**Questions?** Use Copilot or check the documentation above. Happy coding! 🚀
