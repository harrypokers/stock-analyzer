# Avanza Stock Analyzer

A comprehensive stock analysis platform that fetches live data from Avanza and analyzes multiple technical and fundamental parameters to identify actionable trading patterns.

## Features

### Technical Indicators
- **RSI (Relative Strength Index)**: Identifies overbought/oversold conditions
- **MACD**: Detects momentum and trend changes
- **Moving Averages**: SMA (20, 50, 200) and EMA (12, 26) for trend analysis
- **Bollinger Bands**: Identifies volatility and support/resistance levels
- **ATR (Average True Range)**: Measures volatility
- **Stochastic Oscillator**: Identifies momentum reversals

### Pattern Recognition
- Golden Cross / Death Cross (moving average crossovers)
- RSI extremes (oversold < 30, overbought > 70)
- MACD crossovers
- Bollinger Band touches
- Stochastic extremes
- Volume spikes
- Higher highs / Lower lows patterns

### Signal Generation
Each pattern generates a signal with:
- Signal type and description
- Confidence level (0-100)
- Action recommendation (BUY, SELL, HOLD)
- Overall signal strength calculation

## API Endpoints

### Analyze Stock
```
GET /api/analyze/:symbol
```
Get comprehensive analysis including:
- Current price
- All technical indicators
- Generated signals
- Signal strength
- 30-day price history

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build TypeScript:
```bash
npm run build
```

3. Set environment variables:
```bash
DATABASE_URL=postgresql://user:password@host/dbname
PORT=3000
```

4. Run the server:
```bash
npm start
```