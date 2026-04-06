const pool = require("../config/db");
const refundQueue = require("../queues/refund.queue");
const { addLedgerEntry } = require('./ledger.service');
const webhookQueue = require('../queues/webhook.queue');
const logger = require('../config/logger');

exports.getWalletByUserId = async (userId) => {
    const result = await pool.query("SELECT id, balance from wallets WHERE  user_id = $1", [userId]);
    return result.rows[0];
};

exports.depositMoney = async (userId, amount) => {

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        //lock wallet row

        const wallet = await client.query("SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE", [userId]);

        if (wallet.rows.length === 0) {
            throw new Error("Wallet not found");
        }

        //update balance

        const updatedWallet = await client.query("UPDATE wallets SET balance = balance + $2 WHERE user_id = $1 RETURNING balance", [userId, amount]);

        // add ledger entry

        await addLedgerEntry(client, userId, 'CREDIT', amount, 'deposit');

        //Insert transaction record

        await client.query("INSERT INTO transactions (receiver_id, amount, type) VALUES ($1, $2, 'deposit')", [userId, amount]);

        await client.query("COMMIT");

        return updatedWallet.rows[0];
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }

};

exports.transferMoney = async (senderId, receiverId, amount, idempotencyKey) => {
    const client = await pool.connect();

    try {
        logger.info(`Transfer initiated: sender=${senderId}, receiver=${receiverId}, amount=${amount}`);
        await client.query("BEGIN");

        //check if idempotency key already exists
        const existing = await client.query(`SELECT response FROM idempotency_keys WHERE user_id = $1 AND idempotency_key = $2`, [senderId, idempotencyKey]);

        if (existing.rows.length > 0) {
            logger.info(`Idempotency key already processed: ${idempotencyKey}, returning cached response`);
            await client.query("ROLLBACK");
            return existing.rows[0].response; // return saved response
        }

        if (senderId === receiverId) {
            throw new Error("Cannot transfer to same account");
        }

        // 🔐 Prevent deadlock (consistent locking order)
        const firstId = Math.min(senderId, receiverId);
        const secondId = Math.max(senderId, receiverId);

        logger.debug(`Locking wallets in order: ${firstId}, ${secondId}`);

        // Lock both wallet rows
        await client.query(
            "SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE",
            [firstId]
        );

        await client.query(
            "SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE",
            [secondId]
        );

        // ✅ Get sender wallet
        const senderWallet = await client.query(
            "SELECT balance FROM wallets WHERE user_id = $1",
            [senderId]
        );

        if (senderWallet.rows.length === 0) {
            throw new Error("Sender wallet not found");
        }

        if (Number(senderWallet.rows[0].balance) < amount) {
            logger.warn(`Insufficient balance for transfer: sender=${senderId}, balance=${senderWallet.rows[0].balance}, required=${amount}`);
            throw new Error("Insufficient balance");
        }

        // ✅ Get receiver wallet
        const receiverWallet = await client.query(
            "SELECT balance FROM wallets WHERE user_id = $1",
            [receiverId]
        );

        if (receiverWallet.rows.length === 0) {
            throw new Error("Receiver wallet not found");
        }

        // ✅ Deduct from sender
        const deductResult = await client.query(
            "UPDATE wallets SET balance = balance - $1 WHERE user_id = $2 RETURNING balance",
            [amount, senderId]
        );

        if (deductResult.rows.length === 0) {
            throw new Error("Failed to deduct from sender");
        }

        await addLedgerEntry(client, senderId, "DEBIT", amount, 'transfer');

        // ✅ Add to receiver
        const addResult = await client.query(
            "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2 RETURNING balance",
            [amount, receiverId]
        );

        if (addResult.rows.length === 0) {
            throw new Error("Failed to add to receiver");
        }

        await addLedgerEntry(client, receiverId, "CREDIT", amount, "transfer");

        // ✅ Insert transaction record
        await client.query(
            "INSERT INTO transactions (sender_id, receiver_id, amount, type) VALUES ($1, $2, $3, 'transfer')",
            [senderId, receiverId, amount]
        );

        const response = {
            message: "Transfer Successful",
            senderBalance: deductResult.rows[0].balance,
            receiverBalance: addResult.rows[0].balance
        };

        //Store idempotent record 
        await client.query(`INSERT INTO idempotency_keys (user_id, idempotency_key, response) VALUES ($1, $2, $3)`, [senderId, idempotencyKey, response]);

        await client.query("COMMIT");

        logger.info(`Transfer completed successfully: sender=${senderId}, receiver=${receiverId}, sender_balance=${response.senderBalance}`);
        return response;

    } catch (error) {
        await client.query("ROLLBACK");
        logger.error(`Transfer failed: ${error.message}`, { senderId, receiverId, amount });
        throw error;
    } finally {
        client.release();
    }
};

exports.getTransactions = async (userId, cursor = null, limit = 10) => {

    let query = `SELECT * FROM transactions WHERE (sender_id = $1 OR receiver_id = $1)`;

    let values = [userId];

    if (cursor) {
        query += ` AND created_at < $2 `;
        values.push(cursor)
    }

    query += `ORDER BY created_at DESC LIMIT $${values.length + 1}`;

    values.push(limit);

    logger.debug(`Fetching transactions for user ${userId}`, { query, valueCount: values.length });
    
    const result = await pool.query(query, values);

    const transactions = result.rows;
    logger.info(`Retrieved ${transactions.length} transactions for user ${userId}`);

    const nextCursor = transactions.length > 0 ? transactions[transactions.length - 1].created_at : null;

    return { transactions, nextCursor };
};

exports.withDrawMoney = async (userId, amount, idempotencyKey) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        //Check idempotency

        const existing = await client.query(`SELECT response FROM idempotency_keys WHERE user_id = $1 AND idempotency_key = $2`, [userId, idempotencyKey]);

        if (existing.rows.length > 0) {
            await client.query("ROLLBACK");
            return existing.rows[0].response;
        };

        //lock wallet row

        const wallet = await client.query(`SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE`, [userId]);

        if (wallet.rows.length === 0) {
            throw new Error("wallet not found");
        }

        logger.debug(`Wallet locked for user ${userId}, balance: ${wallet.rows[0].balance}`);
        const currentBalance = Number(wallet.rows[0].balance);

        //Check sufficient balance
        if (currentBalance < amount) {
            logger.warn(`Withdrawal denied: insufficient balance for user ${userId}, balance: ${currentBalance}, requested: ${amount}`);
            throw new Error("Insufficient balance");
        }

        //deduct balance

        const updatedWallet = await client.query(`UPDATE wallets SET balance = balance - $1 WHERE user_id = $2 RETURNING balance`, [amount, userId]);

        //add ledger entry

        await addLedgerEntry(client, userId, "DEBIT", amount, "withdrawal_request");

        //Insert transaction record

        const transactionResult = await client.query(`INSERT INTO transactions (sender_id, amount, type, status) VALUES ($1, $2, 'withdrawal','pending') RETURNING id`, [userId, amount]);

        const transactionId = transactionResult.rows[0].id;
        const response = {
            message: "Withdrawal request created",
            transactionId,
            status: "pending",
            newBalance: updatedWallet.rows[0].balance

        };

        //store idempotency record

        await client.query(`INSERT INTO idempotency_keys (user_id, idempotency_key, response) VALUES ($1, $2, $3)`, [userId, idempotencyKey, response]);

        await client.query("COMMIT");

        return response;
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    };
};

exports.processWithdrawal = async (transactionId, approve) => {
    const client = await pool.connect();
    logger.info("processing withdrawal api begins");
    try {
        await client.query("BEGIN");

        const txResult = await client.query(`SELECT * FROM transactions WHERE id = $1 AND type = 'withdrawal' FOR UPDATE`, [transactionId]);

        if (txResult.rows.length === 0) {
            throw new Error("Withdrawal transaction not found");
        }

        const tx = txResult.rows[0];

        if (tx.status !== 'pending') {
            throw new Error("Withdrawal alerdy processed");
        };

        if (approve) {
            logger.info("admin is approved withdrawal request");
            //Mark as completed
            await client.query(`UPDATE transactions SET status = 'completed' WHERE id = $1`, [transactionId]);

            //Webhook should only fire when withdrawal is approved
            // push webhook job

            await webhookQueue.add("transactionWebhook", {
                event: "withdrawal.completed",
                transactionId: transactionId,
                userId: tx.sender_id,
                amount: tx.amount
            }, {
                attempts: 5,
                backoff: {
                    type: "exponential",
                    delay: 5000
                }
            });

        }
        else {
            logger.info("admin is not approved your request so money is refunding from wallets");
            //Refund balance
            await client.query(`UPDATE transactions SET status = 'failed' WHERE id = $1`, [transactionId]);

            //push refund job to the queue

            const job = await refundQueue.add("refundJob", {
                userId: tx.sender_id,
                amount: tx.amount
            }, {
                attempts: 5,
                backoff: {
                    type: "exponential",
                    delay: 5000
                },
                removeOnComplete: true,
                removeOnFail: false
            });

            logger.info(`Refund job queued: ${job.id} for user ${tx.sender_id}`);
        }

        await client.query("COMMIT");
        
        logger.info(`Withdrawal processed successfully`);
        return { message: "Withdrawal processed successfully" };
    }
    catch (error) {
        logger.error(`Withdrawal failed: ${error.message}`);
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
};