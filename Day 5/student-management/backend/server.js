require('dotenv').config();
const express = require('express');
const cors = require('cors');
const studentsRouter = require('./routes/students');
const { pool } = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());

app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
  res.type('application/json').send('{}');
});

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (err) {
    console.error(err);
    res.status(503).json({ ok: false, database: 'unavailable' });
  }
});

app.use('/api/students', studentsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

(async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('Database connection ready');
  } catch (err) {
    console.warn(
      'Database not reachable at startup — fix credentials or start PostgreSQL:',
      err.message
    );
  }



  console.log({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    db: process.env.PGDATABASE
  });




  app.listen(PORT, () => {
    console.log(`Student API listening on http://localhost:${PORT}`);
  });
})();
