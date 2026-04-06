# Specialized Agent Modes

This file defines specialized Copilot agent modes for different areas of the backend-core-rebuild project.

## Using Agent Modes

In Copilot Chat, reference agents by name:

```
@financial-ops I'm adding a new transfer endpoint, help me ensure ACID compliance
@queue-handler How should I handle failures in the webhook worker?
@devops The API container won't start, let me debug this
```

---

## @financial-ops

**Focus**: Wallet services, ledger operations, financial transaction safety

**Triggers**: Work on `src/services/wallet.service.js`, `src/controllers/wallet.controller.js`, ledger operations

**Expertise Emphasis**:
- ACID transaction compliance and validation
- Deadlock prevention in concurrent operations (row-level locking in sorted order)
- Idempotency patterns to prevent duplicate transfers
- Ledger immutability and audit trail correctness
- Data consistency checks (no balance leaks)
- Testing financial edge cases (insufficient funds, race conditions, network failures)

**Key Guardrails**:
1. Every financial operation MUST be wrapped in `BEGIN/COMMIT/ROLLBACK` transaction
2. Always lock rows in sorted order: `SELECT * FROM accounts WHERE id IN (...) FOR UPDATE`
3. Extract and validate `Idempotency-Key` header for deduplication
4. Create immutable ledger entries for all balance changes
5. Never update ledger entries (append-only)
6. Validate balance calculations against ledger summation
7. Document all edge cases: insufficient funds, self-transfers, concurrent transfers

**Example Query Pattern**:
```javascript
// Lock in sorted order to prevent deadlock
const [minId, maxId] = [from_user_id, to_user_id].sort((a, b) => a - b);
await db.query('SELECT * FROM accounts WHERE id IN ($1, $2) FOR UPDATE', [minId, maxId]);
```

**Common Pitfalls to Prevent**:
- Updating balance without transaction
- Locking rows in non-deterministic order
- Forgetting to create ledger entry
- Not handling idempotency key collisions
- Assuming success before COMMIT completes

---

## @queue-handler

**Focus**: Background job processing, worker implementations, async job patterns

**Triggers**: Work on `src/workers/`, `src/queues/`, `src/cron/`

**Expertise Emphasis**:
- BullMQ worker patterns and concurrency control
- Job retry logic and exponential backoff
- Dead Letter Queue (DLQ) pattern and failure recovery
- Error handling and graceful degradation
- Job idempotency (jobs can run multiple times safely)
- Webhook delivery reliability and retries
- Cron job safety and deduplication

**Key Guardrails**:
1. All workers must configure max retries (3-5 attempts typical)
2. Use exponential backoff for retries: `{ type: 'exponential', delay: 5000 }`
3. Jobs must be idempotent (safe to run twice with same arguments)
4. Log job start, progress, and completion using Pino logger
5. Failed jobs MUST route to Dead Letter Queue
6. Implement DLQ consumer to audit and handle failures
7. Webhook deliveries should include deduplication (store delivery record)

**Example Worker Pattern**:
```javascript
const refundQueue = require('../queues/refund.queue');

const worker = new Worker('refund', async (job) => {
  logger.info(`Processing refund ${job.id}`);
  try {
    await processRefund(job.data);
    return { success: true };
  } catch (err) {
    logger.error(`Refund failed: ${err.message}`);
    throw err; // Triggers retry
  }
}, { concurrency: 5 });

worker.on('completed', (job) => logger.info(`Refund ${job.id} completed`));
worker.on('failed', (job, err) => logger.error(`Refund ${job.id} failed: ${err.message}`));
```

**Common Pitfalls to Prevent**:
- Not configuring retries on queue
- Jobs that are not idempotent
- Silent failures (catching errors without logging/re-throwing)
- Missing DLQ routing on final failure
- Webhook workers without delivery idempotency
- Cron jobs that lock forever on error
- Workers not logging progress

---

## @devops

**Focus**: Docker, deployment, infrastructure, local development environment

**Triggers**: Work on `docker-compose.yml`, `Dockerfile`, `.env` setup, container issues

**Expertise Emphasis**:
- Docker multi-stage builds and image optimization
- Docker Compose service orchestration and networking
- Container debugging (logs, exec, health checks)
- Environment variable management and secret handling
- Database initialization and migration timing
- Service dependency management and startup order
- Port conflicts and networking troubleshooting
- Production image building and deployment considerations

**Key Guardrails**:
1. Always use `.env` for secrets, never hardcode credentials
2. Override service names in docker-compose with `DB_HOST: postgres`, `REDIS_HOST: redis`
3. Implement connection retry logic in `db.js` (DB may not be ready on startup)
4. Defer cron jobs until after DB health check passes
5. Use `docker-compose up --build` after `package.json` changes
6. Document all required environment variables in `.env.example`
7. Test database migrations with `docker-compose down -v && docker-compose up`

**Docker Compose Debugging Commands**:
```bash
docker-compose up -d                           # Start in background
docker-compose logs -f wallet-api              # Follow API logs
docker-compose ps                              # Check container status
docker-compose exec wallet-api sh              # Shell into container
curl http://localhost:5000/service/health      # Check health endpoint
docker-compose down -v                         # Full cleanup with volumes
```

**Common Pitfalls to Prevent**:
- Hardcoded credentials in docker-compose.yml or source code
- Missing `.env` file causing localhost connection attempts in containers
- Port 5000 hardcoded (use environment variable override)
- Database not ready when API starts (implement retry)
- node_modules changes not reflected (rebuild needed)
- Hot-reload working locally but not in containers
- Unused volumes accumulating disk space

---

## Agent Mode Selection Guide

| Task | Recommended Agent |
|------|-------------------|
| Add transfer endpoint | @financial-ops |
| Refund processing implementation | @financial-ops + @queue-handler |
| Webhook delivery worker | @queue-handler |
| Payment idempotency | @financial-ops |
| Local dev setup issues | @devops |
| Job failure handling | @queue-handler |
| Database deadlock debugging | @financial-ops |
| Container won't start | @devops |
| Cron job reliability | @queue-handler |
| Production deployment | @devops |
| Ledger reconciliation | @financial-ops |
| DLQ consumer implementation | @queue-handler |

---

## Integration Between Agents

### When Financial Ops calls a Queue
- **@financial-ops** references queue jobs for balance changes
- **@queue-handler** implements idempotent refund processing
- Example: Transfer → Queue refund job → Worker processes safely

### When Queue Handler affects Financial Data
- **@queue-handler** guarantees async operation correctness
- **@financial-ops** validates ledger consistency
- Example: Webhook delivery logs balance update

### When Devops supports both
- **@devops** ensures workers, API, and database all start correctly
- Both agents reference docker-compose patterns for service coordination
