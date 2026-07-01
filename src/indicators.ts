interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Indicators {
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  atr: number;
  stochasticK: number;
  stochasticD: number;
}

export function calculateAllIndicators(prices: PriceData[]): Indicators {
  const closes = prices.map((p) => p.close);

  return {
    rsi: calculateRSI(closes),
    macd: calculateMACD(closes).macd,
    macdSignal: calculateMACD(closes).signal,
    macdHistogram: calculateMACD(closes).histogram,
    sma20: calculateSMA(closes, 20),
    sma50: calculateSMA(closes, 50),
    sma200: calculateSMA(closes, 200),
    ema12: calculateEMA(closes, 12),
    ema26: calculateEMA(closes, 26),
    bollingerUpper: calculateBollinger(closes).upper,
    bollingerMiddle: calculateBollinger(closes).middle,
    bollingerLower: calculateBollinger(closes).lower,
    atr: calculateATR(prices),
    stochasticK: calculateStochastic(prices).k,
    stochasticD: calculateStochastic(prices).d,
  };
}

function calculateSMA(prices: number[], period: number): number {
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function calculateEMA(prices: number[], period: number): number {
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateRSI(prices: number[], period: number = 14): number {
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const gains = changes.filter((c) => c > 0).reduce((a, b) => a + b, 0) / period;
  const losses =
    Math.abs(changes.filter((c) => c < 0).reduce((a, b) => a + b, 0)) / period;

  const rs = gains / (losses || 1);
  return 100 - 100 / (1 + rs);
}

function calculateMACD(
  prices: number[]
): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  const signal = (macd + calculateEMA(prices, 9)) / 2;
  return { macd, signal, histogram: macd - signal };
}

function calculateBollinger(
  prices: number[]
): { upper: number; middle: number; lower: number } {
  const period = 20;
  const slice = prices.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance =
    slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / slice.length;
  const stdDev = Math.sqrt(variance);
  return {
    upper: middle + stdDev * 2,
    middle,
    lower: middle - stdDev * 2,
  };
}

function calculateATR(prices: PriceData[], period: number = 14): number {
  const trs = [];
  for (let i = 1; i < prices.length; i++) {
    const tr = Math.max(
      prices[i].high - prices[i].low,
      Math.abs(prices[i].high - prices[i - 1].close),
      Math.abs(prices[i].low - prices[i - 1].close)
    );
    trs.push(tr);
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calculateStochastic(
  prices: PriceData[]
): { k: number; d: number } {
  const period = 14;
  const slice = prices.slice(-period);
  const low = Math.min(...slice.map((p) => p.low));
  const high = Math.max(...slice.map((p) => p.high));
  const close = prices[prices.length - 1].close;

  const k = ((close - low) / (high - low)) * 100;
  const d = k; // Simplified

  return { k, d };
}