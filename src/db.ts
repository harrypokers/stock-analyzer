import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let dbConnected = false;

export async function initDb() {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS stocks (
          id SERIAL PRIMARY KEY,
          symbol VARCHAR(20) UNIQUE NOT NULL,
          name VARCHAR(255),
          sector VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS price_history (
          id SERIAL PRIMARY KEY,
          stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          open DECIMAL(10, 2),
          high DECIMAL(10, 2),
          low DECIMAL(10, 2),
          close DECIMAL(10, 2),
          volume BIGINT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(stock_id, date)
        );

        CREATE TABLE IF NOT EXISTS technical_indicators (
          id SERIAL PRIMARY KEY,
          stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          rsi DECIMAL(5, 2),
          macd DECIMAL(10, 4),
          macd_signal DECIMAL(10, 4),
          macd_histogram DECIMAL(10, 4),
          sma_20 DECIMAL(10, 2),
          sma_50 DECIMAL(10, 2),
          sma_200 DECIMAL(10, 2),
          ema_12 DECIMAL(10, 2),
          ema_26 DECIMAL(10, 2),
          bollinger_upper DECIMAL(10, 2),
          bollinger_middle DECIMAL(10, 2),
          bollinger_lower DECIMAL(10, 2),
          atr DECIMAL(10, 4),
          stochastic_k DECIMAL(5, 2),
          stochastic_d DECIMAL(5, 2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(stock_id, date)
        );

        CREATE TABLE IF NOT EXISTS signals (
          id SERIAL PRIMARY KEY,
          stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          signal_type VARCHAR(50),
          confidence DECIMAL(5, 2),
          description TEXT,
          action VARCHAR(10),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_price_history_stock_date ON price_history(stock_id, date DESC);
        CREATE INDEX IF NOT EXISTS idx_technical_indicators_stock_date ON technical_indicators(stock_id, date DESC);
        CREATE INDEX IF NOT EXISTS idx_signals_stock_date ON signals(stock_id, date DESC);
      `);
      dbConnected = true;
      console.log("Database initialized");
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn("Database connection failed - running in demo mode:", (err as Error).message);
    dbConnected = false;
  }
}

export async function createUser(username: string, password: string) {
  if (!dbConnected) {
    return { id: Math.floor(Math.random() * 10000), username };
  }
  const client = await pool.connect();
  try {
    const result = await client.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username",
      [username, password]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getUserByUsername(username: string) {
  if (!dbConnected) {
    return { id: 1, username, password: "demo123" };
  }
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, username, password FROM users WHERE username = $1",
      [username]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export default pool;
