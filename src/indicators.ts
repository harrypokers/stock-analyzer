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
  adx: number;
  cci: number;
  obv: number;
  vpt: number;
  roc: number;
  williams: number;
}

export function calculateAllIndicators(prices: PriceData[]): Indicators {
  const closes = prices.map((p) => p.close);
  const highs = prices.map((p) => p.high);
  const lows = prices.map((p) => p.low);
  const volumes = prices.map((p) => p.volume);

  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const bollinger = calculateBollinger(closes);

  return {
    rsi: calculateRSI(closes),
    macd: calculateMACD(closes).macd,
    macdSignal: calculateMACD(closes).signal,
    macdHistogram: calculateMACD(closes).histogram,
    sma20,
    sma50,
    sma200,
    ema12: calculateEMA(closes, 12),
    ema26: calculateEMA(closes, 26),
    bollingerUpper: bollinger.upper,
    bollingerMiddle: bollinger.middle,
    bollingerLower: bollinger.lower,
    atr: calculateATR(prices),
    stochasticK: calculateStochastic(prices).k,
    stochasticD: calculateStochastic(prices).d,
    adx: calculateADX(prices),
    cci: calculateCCI(prices),
    obv: calculateOBV(closes, volumes),
    vpt: calculateVPT(closes, volumes),
    roc: calculateROC(closes),
    williams: calculateWilliamsR(prices),
  };
}

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const gains = changes.filter((c) => c > 0).reduce((a, b) => a + b, 0) / period;
  const losses = Math.abs(changes.filter((c) => c < 0).reduce((a, b) => a + b, 0)) / period;

  const rs = gains / (losses || 1);
  return 100 - 100 / (1 + rs);
}

function calculateMACD(
  prices: number[]
): { macd: number; signal: number; histogram: number } {
  if (prices.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  
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
  if (prices.length < period) {
    const avg = prices[prices.length - 1] || 0;
    return { upper: avg * 1.1, middle: avg, lower: avg * 0.9 };
  }
  
  const slice = prices.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / slice.length;
  const stdDev = Math.sqrt(variance);
  return {
    upper: middle + stdDev * 2,
    middle,
    lower: middle - stdDev * 2,
  };
}

function calculateATR(prices: PriceData[], period: number = 14): number {
  if (prices.length < 2) return 0;
  
  const trs = [];
  for (let i = 1; i < prices.length; i++) {
    const tr = Math.max(
      prices[i].high - prices[i].low,
      Math.abs(prices[i].high - prices[i - 1].close),
      Math.abs(prices[i].low - prices[i - 1].close)
    );
    trs.push(tr);
  }
  
  if (trs.length === 0) return 0;
  const slice = trs.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function calculateStochastic(
  prices: PriceData[]
): { k: number; d: number } {
  const period = 14;
  if (prices.length < period) {
    return { k: 50, d: 50 };
  }
  
  const slice = prices.slice(-period);
  const low = Math.min(...slice.map((p) => p.low));
  const high = Math.max(...slice.map((p) => p.high));
  const close = prices[prices.length - 1].close;

  const k = high === low ? 50 : ((close - low) / (high - low)) * 100;
  return { k, d: k };
}

function calculateADX(prices: PriceData[]): number {
  if (prices.length < 14) return 50;
  
  let upMove = 0,
    downMove = 0;
  for (let i = prices.length - 14; i < prices.length; i++) {
    if (i > 0) {
      const up = prices[i].high - prices[i - 1].high;
      const down = prices[i - 1].low - prices[i].low;
      if (up > down && up > 0) upMove += up;
      if (down > up && down > 0) downMove += down;
    }
  }
  return Math.min(100, Math.max(0, ((upMove - downMove) / (upMove + downMove + 1)) * 100 + 50));
}

function calculateCCI(prices: PriceData[]): number {
  const period = 20;
  if (prices.length < period) return 0;
  
  const slice = prices.slice(-period);
  const tp = slice.map((p) => (p.high + p.low + p.close) / 3);
  const sma = tp.reduce((a, b) => a + b, 0) / tp.length;
  const mad = tp.reduce((a, b) => a + Math.abs(b - sma), 0) / tp.length;
  
  if (mad === 0) return 0;
  return (tp[tp.length - 1] - sma) / (0.015 * mad);
}

function calculateOBV(closes: number[], volumes: number[]): number {
  let obv = 0;
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) obv += volumes[i];
    else if (closes[i] < closes[i - 1]) obv -= volumes[i];
  }
  return obv;
}

function calculateVPT(closes: number[], volumes: number[]): number {
  let vpt = 0;
  for (let i = 1; i < closes.length; i++) {
    const change = (closes[i] - closes[i - 1]) / closes[i - 1];
    vpt += volumes[i] * change;
  }
  return vpt;
}

function calculateROC(prices: number[], period: number = 12): number {
  if (prices.length < period) return 0;
  const oldPrice = prices[prices.length - 1 - period];
  const newPrice = prices[prices.length - 1];
  if (oldPrice === 0) return 0;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

function calculateWilliamsR(prices: PriceData[], period: number = 14): number {
  if (prices.length < period) return -50;
  
  const slice = prices.slice(-period);
  const high = Math.max(...slice.map((p) => p.high));
  const low = Math.min(...slice.map((p) => p.low));
  const close = prices[prices.length - 1].close;
  
  if (high === low) return -50;
  return -100 * ((high - close) / (high - low));
}