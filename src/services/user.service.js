const pool = require('../config/db');

//PostgreSql uses parameterized queries to prevent sql injection , very important for security($1,$2)

exports.getAllUsers = async () => {
    const result = await pool.query('SELECT * FROM users');
    return result.rows;
};


exports.createUser = async (name, email) => {
    const result = await pool.query("INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *", [name, email]);
    return result.rows[0];
};


//update register with transaction + wallet creation
exports.registerUser = async (name, email, passwordHash) => {

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        //1. INSERT USER
        const userResult = await client.query("INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at", [name, email, passwordHash]);

        const user = userResult.rows[0];

        //2. Automatically create wallet

        await client.query("INSERT INTO wallets (user_id) VALUES ($1)", [user.id]);

        await client.query("COMMIT");

        return user;
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }

};

exports.findUserByEmail = async (email) => {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0];
};

