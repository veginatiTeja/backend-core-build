const pool = require("../config/db");

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


exports.transferMoney = async (senderId, receiverId, amount) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        if (senderId === receiverId) {
            throw new Error("Cannot transfer to same account");
        }

        // 🔐 Prevent deadlock (consistent locking order)
        const firstId = Math.min(senderId, receiverId);
        const secondId = Math.max(senderId, receiverId);

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

        // ✅ Add to receiver
        const addResult = await client.query(
            "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2 RETURNING balance",
            [amount, receiverId]
        );

        if (addResult.rows.length === 0) {
            throw new Error("Failed to add to receiver");
        }

        // ✅ Insert transaction record
        await client.query(
            "INSERT INTO transactions (sender_id, receiver_id, amount, type) VALUES ($1, $2, $3, 'transfer')",
            [senderId, receiverId, amount]
        );

        await client.query("COMMIT");

        return {
            message: "Transfer Successful",
            senderBalance: deductResult.rows[0].balance,
            receiverBalance: addResult.rows[0].balance
        };

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

exports.getTransactions = async (userId, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;


    //get transactions
    const transactionResult = await pool.query(`SELECT * FROM transactions WHERE sender_id = $1 OR receiver_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, [userId, limit, offset]);

    //get total count

    const countResult = await pool.query(`SELECT COUNT(*) FROM transactions WHERE sender_id = $1 OR receiver_id = $1`, [userId]);

    const total = Number(countResult.rows[0].count);

    return { total, page, limit, transactions: transactionResult.rows}
}
