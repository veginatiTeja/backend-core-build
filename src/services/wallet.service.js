const pool = require("../config/db");

exports.getWalletByUserId = async (userId) => {
    const result = await pool.query("SELECT id, balance from wallets WHERE  user_id = $1", [userId]);
    return result.rows[0];
};


exports.depositMoney = async (userId, amount) => {

    const client = await pool.connect();

    try{
       await client.query("BEGIN");

       //lock wallet row

       const wallet = await client.query("SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE", [userId]);

       if(wallet.rows.length === 0) {
        throw new Error("Wallet not found");
       }

       //update balance

       const updatedWallet = await client.query("UPDATE wallets SET balance = balance + $2 WHERE user_id = $1 RETURNING balance", [userId, amount]);

       //Insert transaction record

       await client.query("INSERT INTO transactions (receiver_id, amount, type) VALUES ($1, $2, 'deposit')", [userId, amount]);

       await client.query("COMMIT");

       return updatedWallet.rows[0];
    }
    catch(error) {
     await client.query("ROLLBACK");
     throw error;
    }
    finally {
        client.release();
    }

};

