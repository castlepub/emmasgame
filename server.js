const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8080;
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

let dbReady = false;

async function initDb() {
  if (!pool) {
    console.warn('DATABASE_URL not set — leaderboard disabled');
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      player_name VARCHAR(40) NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      difficulty VARCHAR(10) NOT NULL DEFAULT 'easy',
      completed BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS scores_rank_idx
    ON scores (score DESC, created_at DESC)
  `);
  dbReady = true;
  console.log('Leaderboard database ready');
}

function cleanName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 40);
}

app.use(express.json({ limit: '16kb' }));
app.use(express.static(__dirname));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, leaderboard: dbReady });
});

app.get('/api/scores', async (req, res) => {
  if (!dbReady) {
    res.json({ scores: [] });
    return;
  }

  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 25);

  try {
    const result = await pool.query(
      `SELECT player_name, score, difficulty, completed, created_at
       FROM scores
       ORDER BY score DESC, created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ scores: result.rows });
  } catch (err) {
    console.error('GET /api/scores failed:', err.message);
    res.status(500).json({ error: 'לא הצלחנו לטעון את טבלת המובילים' });
  }
});

app.post('/api/scores', async (req, res) => {
  if (!dbReady) {
    res.status(503).json({ error: 'טבלת המובילים לא זמינה כרגע' });
    return;
  }

  const playerName = cleanName(req.body?.playerName);
  const score = Number.parseInt(req.body?.score, 10);
  const difficulty = req.body?.difficulty === 'hard' ? 'hard' : 'easy';
  const completed = Boolean(req.body?.completed);

  if (!playerName) {
    res.status(400).json({ error: 'שם שחקנית חסר' });
    return;
  }

  if (!Number.isFinite(score) || score < 0 || score > 999999) {
    res.status(400).json({ error: 'ניקוד לא תקין' });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO scores (player_name, score, difficulty, completed)
       VALUES ($1, $2, $3, $4)
       RETURNING player_name, score, difficulty, completed, created_at`,
      [playerName, score, difficulty, completed]
    );
    res.status(201).json({ score: result.rows[0] });
  } catch (err) {
    console.error('POST /api/scores failed:', err.message);
    res.status(500).json({ error: 'לא הצלחנו לשמור את הניקוד' });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

initDb()
  .catch((err) => {
    console.error('Database init failed:', err.message);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Emma game server listening on ${PORT}`);
    });
  });
