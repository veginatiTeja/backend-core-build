# Wallet Operations - Financial Safety Guidelines

**Scope**: This file applies to `src/services/wallet.service.js`, `src/controllers/wallet.controller.js`, ledger operations, and any financial transaction endpoints.

This is a specialized instruction set emphasizing ACID compliance, data consistency, and financial safety.

---

## Golden Rules for Financial Operations

### 1. Every Financial Change is a Transaction
```javascript
// ✅ CORRECT
await db.query('BEGIN');
try {
  await db.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, from]);
  await db.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, to]);
  await db.query('INSERT INTO ledger (...) VALUES (...)', [...]);
  await db.query('COMMIT');
} catch (err) {
  await db.query('ROLLBACK');
  throw err;
}

// ❌ WRONG - No transaction, risk of partial updates
await db.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, from]);
// Crash here -> to account never updated, balance leaked!
await db.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, to]);
```

### 2. Lock Rows in Sorted Order to Prevent Deadlocks
```javascript
// ✅ CORRECT - Consistent lock ordering
const [minId, maxId] = [from_id, to_id].sort((a, b) => a - b);
await db.query('BEGIN');
await db.query('SELECT * FROM accounts WHERE id IN ($1, $2) FOR UPDATE', [minId, maxId]);
// Now safe to update in any order, lock order is deterministic

// ❌ WRONG - Different order in different transactions = deadlock
// Thread A: locks user_5, waits for user_3
// Thread B: locks user_3, waits for user_5
// DEADLOCK!
```

### 3. Deduplication via Idempotency Key
```javascript
// ✅ CORRECT - Extract and check idempotency key
const idempotencyKey = req.headers['idempotency-key'];
if (!idempotencyKey) throw new Error('Idempotency-Key required');

// Check Redis cache first (fast path)
const cached = await redis.get(`idempotency:${idempotencyKey}`);
if (cached) return JSON.parse(cached); // Return cached result

// Process transfer...
const result = { success: true, newBalance: ... };

// Cache result BEFORE sending response (fast dedup on retry)
await redis.setex(`idempotency:${idempotencyKey}`, 86400, JSON.stringify(result));
res.status(200).json(result);

// ❌ WRONG - No idempotency
// Retry on network timeout -> duplicate transfer!
```

### 4. Immutable Ledger, Mutable Transactions
```javascript
// ✅ CORRECT - Append-only ledger, mutable transactions table
// Ledger: NEVER UPDATE OR DELETE
await db.query(`
  INSERT INTO ledger (account_id, change_amount, type, reference_id, timestamp)
  VALUES ($1, $2, 'TRANSFER_OUT', $3, NOW())
`, [from_id, -amount, transfer_id]);

// Transactions: Can be updated (metadata, status changes)
await db.query(`
  UPDATE transactions SET status = 'COMPLETED' WHERE id = $1
`, [transfer_id]);

// ❌ WRONG - Modifying ledger
// Auditors and reconciliation queries become unreliable!
await db.query('UPDATE ledger SET change_amount = $1 WHERE id = $2', [newAmount, ledgerId]);
```

### 5. Balance Consistency Checks
```javascript
// ✅ CORRECT - Validate balance after every operation
const result = await db.query(`
  SELECT SUM(change_amount) as computed_balance 
  FROM ledger WHERE account_id = $1
`, [accountId]);
const ledgerBalance = result.rows[0].computed_balance;

const account = await db.query('SELECT balance FROM accounts WHERE id = $1', [accountId]);
const dbBalance = account.rows[0].balance;

if (ledgerBalance !== dbBalance) {
  throw new Error(`Balance mismatch! Ledger: ${ledgerBalance}, DB: ${dbBalance}`);
}

// ❌ WRONG - No validation
// Undetected bugs cause balance leaks over time
```

---

## Endpoint Implementation Checklist

When adding a financial operation endpoint, verify:

- [ ] Entire operation wrapped in `BEGIN/COMMIT/ROLLBACK` transaction
- [ ] All affected accounts locked via `SELECT ... FOR UPDATE` in sorted order
- [ ] `Idempotency-Key` header extracted and validated
- [ ] Idempotency key checked in Redis cache (return cached response if exists)
- [ ] Request validated (amounts > 0, accounts exist, balances sufficient)
- [ ] Ledger entry created for ALL balance changes
- [ ] Transactions table record created with full metadata
- [ ] Success response cached in Redis immediately (before ROLLBACK risk)
- [ ] Error response does NOT get cached (allow retry)
- [ ] Balance consistency check passes post-operation
- [ ] Appropriate logging at each stage (request, lock acquired, transfer complete, response sent)
- [ ] Endpoint rate-limited: `rate-limiter-flexible` with user-based limits
- [ ] API documentation with Swagger JSDoc comments
- [ ] Test cases cover: happy path, insufficient funds, duplicate request (idempotency), race conditions

---

## Common Financial Operation Patterns

### Transfer Between Accounts
```javascript
exports.transfer = asyncHandler(async (req, res) => {
  const { from_id, to_id, amount } = req.body;
  const idempotencyKey = req.headers['idempotency-key'];
  
  // Validate
  if (!idempotencyKey) throw new HttpError(400, 'Idempotency-Key required');
  if (amount <= 0) throw new HttpError(400, 'Amount must be positive');
  if (from_id === to_id) throw new HttpError(400, 'Cannot transfer to self');
  
  // Check cache
  const cached = await redis.get(`idempotency:${idempotencyKey}`);
  if (cached) return res.json(JSON.parse(cached));
  
  // Process with transaction
  await db.query('BEGIN');
  try {
    // Lock in sorted order
    const [minId, maxId] = [from_id, to_id].sort((a, b) => a - b);
    await db.query(
      'SELECT * FROM accounts WHERE id IN ($1, $2) FOR UPDATE',
      [minId, maxId]
    );
    
    // Check balance
    const from = await db.query('SELECT balance FROM accounts WHERE id = $1', [from_id]);
    if (from.rows[0].balance < amount) {
      throw new HttpError(400, 'Insufficient funds');
    }
    
    // Perform transfer
    await db.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, from_id]
    );
    await db.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, to_id]
    );
    
    // Create ledger entries
    const transferId = generateUUID();
    await db.query(
      'INSERT INTO ledger (account_id, change_amount, type, reference_id) VALUES ($1, $2, $3, $4)',
      [from_id, -amount, 'TRANSFER_OUT', transferId]
    );
    await db.query(
      'INSERT INTO ledger (account_id, change_amount, type, reference_id) VALUES ($1, $2, $3, $4)',
      [to_id, amount, 'TRANSFER_IN', transferId]
    );
    
    // Create transaction record
    await db.query(
      'INSERT INTO transactions (id, from_id, to_id, amount, status) VALUES ($1, $2, $3, $4, $5)',
      [transferId, from_id, to_id, amount, 'COMPLETED']
    );
    
    await db.query('COMMIT');
    
    // Get updated balance
    const updated = await db.query('SELECT balance FROM accounts WHERE id = $1', [from_id]);
    const result = { success: true, transfer_id: transferId, new_balance: updated.rows[0].balance };
    
    // Cache before response
    await redis.setex(`idempotency:${idempotencyKey}`, 86400, JSON.stringify(result));
    res.status(200).json(result);
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
});
```

### Refund Processing (from Queue)
```javascript
// In refund.worker.js
const worker = new Worker('refund', async (job) => {
  const { original_transfer_id, reason } = job.data;
  
  // All refunds are idempotent - check if already processed
  const existing = await db.query(
    'SELECT * FROM refunds WHERE original_transfer_id = $1',
    [original_transfer_id]
  );
  if (existing.rows.length > 0) {
    logger.info(`Refund already processed: ${original_transfer_id}`);
    return { refund_id: existing.rows[0].id, already_processed: true };
  }
  
  // Fetch original transfer
  const transfer = await db.query(
    'SELECT * FROM transactions WHERE id = $1',
    [original_transfer_id]
  );
  if (!transfer.rows.length) throw new Error('Original transfer not found');
  
  const { from_id, to_id, amount } = transfer.rows[0];
  const refundId = generateUUID();
  
  // Reverse the transfer (to becomes from, from becomes to)
  await db.query('BEGIN');
  try {
    const [minId, maxId] = [to_id, from_id].sort((a, b) => a - b);
    await db.query(
      'SELECT * FROM accounts WHERE id IN ($1, $2) FOR UPDATE',
      [minId, maxId]
    );
    
    // Create refund
    await db.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, from_id]
    );
    await db.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, to_id]
    );
    
    await db.query(
      'INSERT INTO ledger (account_id, change_amount, type, reference_id) VALUES ($1, $2, $3, $4)',
      [from_id, amount, 'REFUND_IN', refundId]
    );
    await db.query(
      'INSERT INTO ledger (account_id, change_amount, type, reference_id) VALUES ($1, $2, $3, $4)',
      [to_id, -amount, 'REFUND_OUT', refundId]
    );
    
    await db.query(
      'INSERT INTO refunds (id, original_transfer_id, refund_reason, status) VALUES ($1, $2, $3, $4)',
      [refundId, original_transfer_id, reason, 'COMPLETED']
    );
    
    await db.query('COMMIT');
    logger.info(`Refund processed: ${refundId}`);
    return { refund_id: refundId };
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
}, { concurrency: 5 });
```

---

## Edge Cases to Handle

### Self-Transfers
```javascript
if (from_id === to_id) {
  throw new HttpError(400, 'Cannot transfer to the same account');
}
```

### Race Conditions on Insufficient Funds
```javascript
// Lock acquired, recalculate balance
const account = await db.query(
  'SELECT balance FROM accounts WHERE id = $1 FOR UPDATE',
  [from_id]
);
// Between validation and lock, other thread may have withdrawn
if (account.rows[0].balance < amount) {
  throw new HttpError(400, 'Insufficient funds (concurrent transfer detected)');
}
```

### Duplicate Idempotency Keys (Different Amounts)
```javascript
const cached = await redis.get(`idempotency:${idempotencyKey}`);
if (cached) {
  const cachedData = JSON.parse(cached);
  // Verify request matches cached request (same amount, from, to)
  if (cachedData.amount !== amount || cachedData.from_id !== from_id) {
    throw new HttpError(409, 'Idempotency-Key used with different request parameters');
  }
  return res.json(cachedData);
}
```

### Network Failure After COMMIT
```javascript
// Transaction committed, but response never reached client
// Client retries with same Idempotency-Key
// Handler checks Redis cache -> found -> returns cached result
// ✅ Correct behavior: no double-charge
```

---

## Testing Financial Operations

### Unit Test: Transaction Rollback
```javascript
test('Transfer fails if second account locked', async () => {
  // Start transfer, simulate lock timeout
  // Verify ROLLBACK occurred and balance unchanged
});
```

### Integration Test: Race Condition (Insufficient Funds)
```javascript
test('Concurrent transfers prevent overdraft', async () => {
  // Thread A & B both try to transfer $600 from account with $1000
  // Only one succeeds, other gets insufficient funds error
  // Final balance: $400 (not $800)
});
```

### Integration Test: Idempotency
```javascript
test('Duplicate request returns cached result', async () => {
  const response1 = await transfer(idempotencyKey, ...);
  const response2 = await transfer(idempotencyKey, ...); // Duplicate
  expect(response1).toEqual(response2); // Same result
  // Verify ledger has only ONE entry (not duplicated)
});
```

### Reconciliation Test: Ledger Consistency
```javascript
test('Ledger balance matches account balance', async () => {
  // Create many transfers
  // Verify: SUM(ledger) === account.balance for all accounts
});
```
