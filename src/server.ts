import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { getStockData, getHistoricalData, searchStocks } from "./avanza.js";
import { calculateAllIndicators } from "./indicators.js";
import { analyzePatterns, calculateSignalStrength } from "./patterns.js";
import { authenticate, login } from "./auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory user storage for demo
const users: { [key: string]: string } = {
  demo: "demo123",
};

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

    if (users[username]) {
      return res.status(409).json({ error: "Username already exists" });
    }

    users[username] = password;
    res.status(201).json({
      message: "User created successfully",
      user: { id: Math.random(), username },
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

    if (users[username] !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = Buffer.from(`${username}:${password}`).toString("base64");
    res.json({
      message: "Login successful",
      user: { id: Math.random(), username },
      token: `Basic ${token}`,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Protected endpoints
app.get("/api/search", authenticate, async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Query parameter required" });
    }
    const results = await searchStocks(query);
    res.json(results);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

app.get("/api/analyze/:symbol", authenticate, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const stockData = await getStockData(symbol);
    const historicalData = await getHistoricalData(symbol, 365);

    if (historicalData.length === 0) {
      return res.status(404).json({ error: "No price data available" });
    }

    const indicators = calculateAllIndicators(historicalData);
    const signals = analyzePatterns(historicalData, indicators);
    const signalStrength = calculateSignalStrength(signals);

    res.json({
      symbol,
      currentPrice: historicalData[historicalData.length - 1].close,
      indicators,
      signals,
      signalStrength,
      priceHistory: historicalData.slice(-30),
    });
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: "Analysis failed" });
  }
});

app.get("/api/signals/:symbol", authenticate, async (req, res) => {
  try {
    const { symbol } = req.params;
    const historicalData = await getHistoricalData(symbol, 365);
    const indicators = calculateAllIndicators(historicalData);
    const signals = analyzePatterns(historicalData, indicators);

    res.json(signals);
  } catch (error) {
    console.error("Signals error:", error);
    res.status(500).json({ error: "Failed to fetch signals" });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Static files and catch-all
app.use(express.static(path.join(__dirname, "../public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`Stock analyzer running on port ${PORT}`);
});