import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import pool, { initDb, createUser, getUserByUsername } from "./db.js";
import { getStockData, getHistoricalData, searchStocks } from "./avanza.js";
import { calculateAllIndicators } from "./indicators.js";
import { analyzePatterns, calculateSignalStrength } from "./patterns.js";
import { authenticate, login, AuthRequest } from "./auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

initDb().catch(err => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});

// Auth endpoints
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    if (username.length < 3 || password.length < 6) {
      return res.status(400).json({
        error: "Username must be 3+ chars, password must be 6+ chars",
      });
    }

    const existing = await getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const user = await createUser(username, password);
    res.status(201).json({
      message: "User created successfully",
      user: { id: user.id, username: user.username },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = await login(username, password);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = Buffer.from(`${username}:${password}`).toString("base64");
    res.json({
      message: "Login successful",
      user,
      token: `Basic ${token}`,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Protected endpoints
app.get("/api/search", authenticate, async (req: AuthRequest, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Query parameter required" });
    }
    const results = await searchStocks(query);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
});

app.get("/api/analyze/:symbol", authenticate, async (req: AuthRequest, res) => {
  try {
    const { symbol } = req.params;
    const client = await pool.connect();

    try {
      let stockId: number;
      const stockResult = await client.query(
        "SELECT id FROM stocks WHERE symbol = $1",
        [symbol]
      );

      if (stockResult.rows.length === 0) {
        const stockData = await getStockData(symbol);
        const insertResult = await client.query(
          "INSERT INTO stocks (symbol, name) VALUES ($1, $2) RETURNING id",
          [symbol, stockData.name]
        );
        stockId = insertResult.rows[0].id;

        const historicalData = await getHistoricalData(symbol, 365);
        for (const data of historicalData) {
          await client.query(
            `INSERT INTO price_history (stock_id, date, open, high, low, close, volume)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (stock_id, date) DO UPDATE SET
             open = $3, high = $4, low = $5, close = $6, volume = $7`,
            [
              stockId,
              data.date,
              data.open,
              data.high,
              data.low,
              data.close,
              data.volume,
            ]
          );
        }
      } else {
        stockId = stockResult.rows[0].id;
      }

      const priceResult = await client.query(
        `SELECT date, open, high, low, close, volume FROM price_history
         WHERE stock_id = $1 ORDER BY date DESC LIMIT 365`,
        [stockId]
      );

      const priceData = priceResult.rows
        .reverse()
        .map((row) => ({
          date: row.date,
          open: parseFloat(row.open),
          high: parseFloat(row.high),
          low: parseFloat(row.low),
          close: parseFloat(row.close),
          volume: parseInt(row.volume),
        }));

      if (priceData.length === 0) {
        return res.status(404).json({ error: "No price data available" });
      }

      const indicators = calculateAllIndicators(priceData);
      const latestDate = priceData[priceData.length - 1].date;

      await client.query(
        `INSERT INTO technical_indicators (stock_id, date, rsi, macd, macd_signal, macd_histogram,
         sma_20, sma_50, sma_200, ema_12, ema_26, bollinger_upper, bollinger_middle, bollinger_lower,
         atr, stochastic_k, stochastic_d)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (stock_id, date) DO UPDATE SET
         rsi = $3, macd = $4, macd_signal = $5, macd_histogram = $6, sma_20 = $7, sma_50 = $8,
         sma_200 = $9, ema_12 = $10, ema_26 = $11, bollinger_upper = $12, bollinger_middle = $13,
         bollinger_lower = $14, atr = $15, stochastic_k = $16, stochastic_d = $17`,
        [
          stockId,
          latestDate,
          indicators.rsi,
          indicators.macd,
          indicators.macdSignal,
          indicators.macdHistogram,
          indicators.sma20,
          indicators.sma50,
          indicators.sma200,
          indicators.ema12,
          indicators.ema26,
          indicators.bollingerUpper,
          indicators.bollingerMiddle,
          indicators.bollingerLower,
          indicators.atr,
          indicators.stochasticK,
          indicators.stochasticD,
        ]
      );

      const signals = analyzePatterns(priceData, indicators);
      const signalStrength = calculateSignalStrength(signals);

      for (const signal of signals) {
        await client.query(
          `INSERT INTO signals (stock_id, date, signal_type, confidence, description, action)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            stockId,
            latestDate,
            signal.type,
            signal.confidence,
            signal.description,
            signal.action,
          ]
        );
      }

      res.json({
        symbol,
        currentPrice: priceData[priceData.length - 1].close,
        indicators,
        signals,
        signalStrength,
        priceHistory: priceData.slice(-30),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: "Analysis failed" });
  }
});

app.get("/api/signals/:symbol", authenticate, async (req: AuthRequest, res) => {
  try {
    const { symbol } = req.params;
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT s.* FROM signals s
         JOIN stocks st ON s.stock_id = st.id
         WHERE st.symbol = $1
         ORDER BY s.date DESC LIMIT 100`,
        [symbol]
      );

      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch signals" });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`Stock analyzer running on port ${PORT}`);
});