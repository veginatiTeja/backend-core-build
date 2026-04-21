require('dotenv').config();

const config = {
  client: 'pg',
  migrations: {
    directory: './migrations'
  }
}


module.exports = {
  development: {
    ...config,
    connection: {
      host: "localhost",
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    }
  },

  docker: {
    ...config,
    connection: {
      host: "postgres",
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    }
  }
}