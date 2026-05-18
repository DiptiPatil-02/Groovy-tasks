// require('dotenv').config();
// const { Pool } = require('pg');

// // Use 127.0.0.1 by default — on Windows, "localhost" often hits ::1 first and can hang or
// // time out if PostgreSQL is only listening on IPv4.
// const host = process.env.PGHOST || '127.0.0.1';
// const port = process.env.PGPORT ? Number(process.env.PGPORT) : 5433;
// const database = process.env.PGDATABASE || 'student_management';
// const user = process.env.PGUSER || 'postgres';
// const password = process.env.PGPASSWORD ?? 'Dips@123';

// const pool = new Pool({
//   host,
//   port,
//   database,
//   user,
//   password,
//   max: 10,
//   idleTimeoutMillis: 30_000,
//   connectionTimeoutMillis: 20_000,
//   keepAlive: true,
//   keepAliveInitialDelayMillis: 10_000,
// });

// console.log(`[db] Pool → ${user}@${host}:${port}/${database}`);

// pool.on('error', (err) => {
//   console.error('[db] Unexpected pool client error:', err.message);
// });

// module.exports = { pool };



const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

module.exports = { pool };