export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Indicators {
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

export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

export function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * multiplier + ema * (1 - multiplier);
  }
  return ema;
}

export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 0;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  const signal = calculateEMA([macd], 9);
  return { macd, signal, histogram: macd - signal };
}

export function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number } {
  const middle = calculateSMA(prices, period);
  const variance = prices.slice(-period).reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period;
  const std = Math.sqrt(variance);
  return { upper: middle + std * stdDev, middle, lower: middle - std * stdDev };
}

export function calculateATR(data: PricePoint[], period: number = 14): number {
  if (data.length < period + 1) return 0;
  let trSum = 0;
  for (let i = data.length - period; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = i > 0 ? data[i - 1].close : data[i].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trSum += tr;
  }
  return trSum / period;
}

export function calculateStochastic(data: PricePoint[], period: number = 14): { k: number; d: number } {
  if (data.length < period) return { k: 0, d: 0 };
  const closes = data.slice(-period).map((d) => d.close);
  const highs = data.slice(-period).map((d) => d.high);
  const lows = data.slice(-period).map((d) => d.low);
  const highestHigh = Math.max(...highs);
  const lowestLow = Math.min(...lows);
  const k = ((closes[closes.length - 1] - lowestLow) / (highestHigh - lowestLow)) * 100;
  const d = (k + (k > 50 ? 50 : 0)) / 2;
  return { k, d };
}

export function calculateAllIndicators(data: PricePoint[]): Indicators {
  const closes = data.map((d) => d.close);
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
    bollingerUpper: calculateBollingerBands(closes).upper,
    bollingerMiddle: calculateBollingerBands(closes).middle,
    bollingerLower: calculateBollingerBands(closes).lower,
    atr: calculateATR(data),
    stochasticK: calculateStochastic(data).k,
    stochasticD: calculateStochastic(data).d,
  };
}