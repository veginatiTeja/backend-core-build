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

exports.registerUser = async (name, email, passwordHash) => {
    const result = await pool.query("INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at",[name, email, passwordHash]);
    return result.rows[0];
}
;

exports.findUserByEmail = async (email) => {
   const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
   return result.rows[0];
};

