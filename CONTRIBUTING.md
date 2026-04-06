# Contributing to Backend Core Rebuild

Welcome! This document outlines how to set up the development environment, contribute code, and understand the project architecture.

## Table of Contents

- [Local Development Setup](#local-development-setup)
- [Project Architecture](#project-architecture)
- [Adding Features](#adding-features)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Deployment](#deployment)
- [Getting Help](#getting-help)

---

## Local Development Setup

### Prerequisites

- Node.js 20+ (matches Dockerfile)
- Docker & Docker Compose
- Git

### Step 1: Clone and Install

```bash
git clone <repo-url>
cd backend-core-rebuild
npm install
```

### Step 2: Environment Variables

Create `.env` file in project root:

```bash
# Copy template
cp .env.example .env

# Edit with your values
nano .env
```

**Required variables** (see `.env.example` for full list):

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/wallet_db
DB_HOST=localhost
DB_PORT=5432
DB_USER=wallet_user
DB_PASSWORD=wallet_pass
DB_NAME=wallet_db

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars-long

# Optional
LOG_LEVEL=info
```

### Step 3: Start Services with Docker Compose

```bash
# Start PostgreSQL, Redis, and the application
docker-compose up

# In another terminal, watch logs
docker-compose logs -f wallet-api
```

The API will be available at `http://localhost:5000`

### Step 4: Verify Setup

```bash
# Check API health
curl http://localhost:5000/service/health

# View Swagger docs
open http://localhost:5000/api-docs

# Access queue dashboard
open http://localhost:5000/admin/queues
```

### Stopping Services

```bash
# Stop all containers
docker-compose down

# Stop and remove volumes (clean slate for next startup)
docker-compose down -v
```

---

## Project Architecture

### High-Level Overview

```
Request → Middleware Chain → Route Handler → Controller
                                              ↓
                                         Service Layer
                                         ↓
                                    Database / Redis / Queues
                                         ↓
                          Background Workers (Refund, Webhook, DLQ)
```

### Core Layers

| Layer | Files | Responsibility |
|-------|-------|-----------------|
| **Routes** | `src/routes/*.route.js` | HTTP endpoints, middleware ordering |
| **Controllers** | `src/controllers/*.controller.js` | Request validation, service orchestration |
| **Services** | `src/services/*.service.js` | Business logic, DB transactions |
| **Models** | `src/config/db.js` | Database queries and connection pooling |
| **Queues** | `src/queues/*.queue.js` | Job definition and configuration |
| **Workers** | `src/workers/*.worker.js` | Background job processing |
| **Middleware** | `src/middlewares/*.middleware.js` | Cross-cutting concerns (auth, logging, rate limit) |

### Key Design Decisions

1. **MVC + Services Pattern**: Clear separation of concerns
2. **Transaction Safety**: All financial operations use explicit transactions
3. **Idempotent Operations**: Transfer deduplication via Idempotency-Key header
4. **Immutable Ledger**: Append-only audit log for all balance changes
5. **Async Job Processing**: BullMQ queues for long-running operations
6. **Rate Limiting**: Dual strategy (IP-based + user-based)

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for detailed patterns.

---

## Adding Features

### Adding a New Endpoint

Follow this checklist:

#### 1. Create Route (`src/routes/{resource}.route.js`)

```javascript
const express = require('express');
const router = express.Router();
const { protectRoute } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');
const controller = require('../controllers/{resource}.controller');

/**
 * @swagger
 * /api/{resource}:
 *   post:
 *     summary: Create new resource
 *     tags: [Resource]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201:
 *         description: Resource created
 *       400:
 *         description: Invalid request
 */
router.post('/', protectRoute, controller.create);

/**
 * @swagger
 * /api/{resource}/{id}:
 *   get:
 *     summary: Get resource by ID
 *     tags: [Resource]
 *     security:
 *       - BearerAuth: []
 */
router.get('/:id', protectRoute, controller.getById);

module.exports = router;
```

#### 2. Create Controller (`src/controllers/{resource}.controller.js`)

```javascript
const { asyncHandler } = require('../utils/asyncHandler');
const logger = require('../config/logger');
const service = require('../services/{resource}.service');

exports.create = asyncHandler(async (req, res) => {
  const { body } = req;
  
  // Validate request
  if (!body.name) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }
  
  logger.info(`Creating resource: ${body.name}`);
  
  // Call service
  const data = await service.create(body);
  
  logger.info(`Resource created: ${data.id}`);
  res.status(201).json({ success: true, data });
});

exports.getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await service.getById(id);
  res.json({ success: true, data });
});
```

#### 3. Create Service (`src/services/{resource}.service.js`)

```javascript
const db = require('../config/db');
const logger = require('../config/logger');

exports.create = async (data) => {
  const result = await db.query(
    'INSERT INTO {resource} (name, created_at) VALUES ($1, NOW()) RETURNING *',
    [data.name]
  );
  return result.rows[0];
};

exports.getById = async (id) => {
  const result = await db.query(
    'SELECT * FROM {resource} WHERE id = $1',
    [id]
  );
  if (!result.rows.length) {
    throw new Error(`{Resource} with ID ${id} not found`);
  }
  return result.rows[0];
};
```

#### 4. Register Route in `src/app.js`

```javascript
const {resource}Route = require('./routes/{resource}.route');

// ... existing middleware ...

app.use('/api/{resource}', {resource}Route);
```

### Adding a Background Job

#### 1. Create Queue (`src/queues/{action}.queue.js`)

```javascript
const { Queue } = require('bullmq');
const redis = require('./config/redis');

const {action}Queue = new Queue('{action}', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

module.exports = {action}Queue;
```

#### 2. Create Worker (`src/workers/{action}.worker.js`)

```javascript
const { Worker } = require('bullmq');
const redis = require('../config/redis');
const logger = require('../config/logger');
const service = require('../services/{action}.service');

const {action}Worker = new Worker('{action}', async (job) => {
  logger.info(`Processing job ${job.id}: ${JSON.stringify(job.data)}`);
  
  try {
    const result = await service.process{Action}(job.data);
    logger.info(`Job ${job.id} completed successfully`);
    return result;
  } catch (err) {
    logger.error(`Job ${job.id} failed: ${err.message}`);
    throw err; // Triggers retry or DLQ
  }
}, {
  connection: redis,
  concurrency: 5
});

{action}Worker.on('completed', (job) => {
  logger.info(`{Action} job completed: ${job.id}`);
});

{action}Worker.on('failed', (job, err) => {
  logger.error(`{Action} job failed: ${job.id} - ${err.message}`);
});

{action}Worker.on('error', (err) => {
  logger.error(`{Action} worker error: ${err.message}`);
});

module.exports = {action}Worker;
```

#### 3. Queue a Job from Service

```javascript
const {action}Queue = require('../queues/{action}.queue');

exports.create{Action} = async (data) => {
  // ... business logic ...
  
  // Queue async job
  await {action}Queue.add('{action}', {
    user_id: data.user_id,
    amount: data.amount
  });
  
  return { success: true, id: data.id };
};
```

---

## Code Standards

### Naming Conventions

| Item | Pattern | Example |
|------|---------|---------|
| Files | descriptive.suffix.js | wallet.service.js, auth.middleware.js |
| Functions | camelCase | getUserById, processRefund |
| Constants | UPPER_SNAKE_CASE | MAX_TRANSFER_AMOUNT, DB_TIMEOUT |
| Variables | camelCase | userId, isValid, refundQueue |
| Async Functions | Include `async` keyword | async function create() {} |

### Error Handling

**Always use asyncHandler for async route handlers:**

```javascript
// ✅ CORRECT
exports.transfer = asyncHandler(async (req, res) => {
  const data = await service.transfer(req.body);
  res.json({ success: true, data });
});

// ❌ AVOID: Manual try/catch unless wrapped in asyncHandler
exports.transfer = async (req, res) => {
  try {
    const data = await service.transfer(req.body);
    res.json({ success: true, data });
  } catch (err) {
    // Error not passed to middleware!
    res.status(500).json({ success: false, message: err.message });
  }
};
```

### Logging Standards

**Always use the Pino logger, never console.log:**

```javascript
const logger = require('../config/logger');

// ✅ CORRECT
logger.info('User created', { userId: user.id });
logger.error('Database error', { error: err.message });
logger.warn('Rate limit exceeded', { user_id: userId });

// ❌ AVOID
console.log('User created'); // Silent in production logs
```

### Database Operations

**Always use parameterized queries to prevent SQL injection:**

```javascript
// ✅ CORRECT
const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// ❌ AVOID
const result = await db.query(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

### Financial Operations

For wallet/ledger operations, see [.github/wallet-ops.instructions.md](.github/wallet-ops.instructions.md) for comprehensive guidelines on ACID compliance, idempotency, and transaction safety.

**TL;DR:**
- Use `BEGIN/COMMIT/ROLLBACK` for all financial operations
- Lock rows in sorted order to prevent deadlocks
- Extract and validate Idempotency-Key header
- Create immutable ledger entries
- Never update ledger records

---

## Testing

### Running Tests

```bash
npm test
```

Currently no tests are implemented. Contribute tests for:
- Route handlers
- Service business logic
- Error conditions
- Concurrent operations
- Financial operation edge cases

### Manual Testing

#### Test Transfer with Curl

```bash
# Set variables
IDEMPOTENCY_KEY=$(uuidgen)
TOKEN="your-jwt-token"

# Create transfer
curl -X POST http://localhost:5000/api/wallet/transfer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{
    "to_id": 2,
    "amount": 100
  }'

# Test idempotency (same request)
curl -X POST http://localhost:5000/api/wallet/transfer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{
    "to_id": 2,
    "amount": 100
  }'
# Should return same result without processing twice
```

#### Monitor Queue Jobs

Open `http://localhost:5000/admin/queues` and:
- View pending, active, completed, and failed jobs
- Inspect job data and progress
- Manually retry failed jobs
- Check Dead Letter Queue for failures

---

## Deployment

### Building Docker Image

```bash
# Build production image (multi-stage, optimized)
docker build -t wallet-api:latest .

# Tag for registry
docker tag wallet-api:latest {registry}/wallet-api:latest
```

### Environment Variables for Production

Create `.env` with production values:

```env
DATABASE_URL=postgresql://prod_user:prod_password@prod-db:5432/wallet_prod
REDIS_URL=redis://prod-redis:6379
JWT_SECRET=use-strong-random-secret-min-32-chars
NODE_ENV=production
PORT=5000
```

### Running in Production

```bash
# With Docker
docker run -p 5000:5000 \
  --env-file .env \
  wallet-api:latest

# Check health
curl http://localhost:5000/service/health
```

### Known Issues

See [.github/copilot-instructions.md](.github/copilot-instructions.md) → **Improvements & Technical Debt** for priority fixes.

---

## Getting Help

### Use Copilot Agents

For specific domain questions, use specialized agents:

```
@financial-ops - Questions about wallet operations, transactions, ledger
@queue-handler - Questions about background jobs, workers, retries
@devops - Questions about Docker, deployment, environment setup
```

### Documentation

- **Architecture Details**: See [.github/copilot-instructions.md](.github/copilot-instructions.md)
- **Financial Operations**: See [.github/wallet-ops.instructions.md](.github/wallet-ops.instructions.md)
- **API Documentation**: Run the project and visit `http://localhost:5000/api-docs`
- **Agent Modes**: See [.github/AGENTS.md](.github/AGENTS.md)

### Common Issues

#### Database Connection Fails

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**: Ensure PostgreSQL is running in Docker:
```bash
docker-compose up postgres
```

#### Module Not Found

```
Error: Cannot find module 'bullmq'
```

**Solution**: Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

#### Port Already in Use

```
Error: listen EADDRINUSE :::5000
```

**Solution**: Either change PORT in `.env` or kill the process on that port:
```bash
lsof -i :5000
kill <PID>
```

---

## License

[Add license info if applicable]

## Code of Conduct

[Add CoC if applicable]
