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
  // Advanced indicators
  adx: number;
  cci: number;
  obv: number;
  vpt: number;
  roc: number;
  williams: number;
}

export interface StockScore {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  score: number;
  momentum: number;
  trend: number;
  volatility: number;
  volume: number;
  buySignal: string;
  indicators: Indicators;
}

export function calculateAdvancedIndicators(prices: PriceData[]): Indicators {
  const closes = prices.map(p => p.close);
  const highs = prices.map(p => p.high);
  const lows = prices.map(p => p.low);
  const volumes = prices.map(p => p.volume);

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
    adx: calculateADX(prices),
    cci: calculateCCI(prices),
    obv: calculateOBV(closes, volumes),
    vpt: calculateVPT(closes, volumes),
    roc: calculateROC(closes),
    williams: calculateWilliamsR(prices),
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
  const gains = changes.filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
  const losses = Math.abs(changes.filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;
  const rs = gains / (losses || 1);
  return 100 - 100 / (1 + rs);
}

function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  const signal = (macd + calculateEMA(prices, 9)) / 2;
  return { macd, signal, histogram: macd - signal };
}

function calculateBollinger(prices: number[]): { upper: number; middle: number; lower: number } {
  const period = 20;
  const slice = prices.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / slice.length;
  const stdDev = Math.sqrt(variance);
  return { upper: middle + stdDev * 2, middle, lower: middle - stdDev * 2 };
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

function calculateStochastic(prices: PriceData[]): { k: number; d: number } {
  const period = 14;
  const slice = prices.slice(-period);
  const low = Math.min(...slice.map(p => p.low));
  const high = Math.max(...slice.map(p => p.high));
  const close = prices[prices.length - 1].close;
  const k = ((close - low) / (high - low)) * 100;
  return { k, d: k };
}

function calculateADX(prices: PriceData[]): number {
  // Simplified ADX calculation
  let upMove = 0, downMove = 0;
  for (let i = prices.length - 14; i < prices.length; i++) {
    if (i > 0) {
      const up = prices[i].high - prices[i - 1].high;
      const down = prices[i - 1].low - prices[i].low;
      if (up > down && up > 0) upMove += up;
      if (down > up && down > 0) downMove += down;
    }
  }
  return Math.min(100, Math.max(0, (upMove - downMove) / (upMove + downMove + 1) * 100 + 50));
}

function calculateCCI(prices: PriceData[]): number {
  const period = 20;
  const slice = prices.slice(-period);
  const tp = slice.map(p => (p.high + p.low + p.close) / 3);
  const sma = tp.reduce((a, b) => a + b, 0) / tp.length;
  const mad = tp.reduce((a, b) => a + Math.abs(b - sma), 0) / tp.length;
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
  return ((prices[prices.length - 1] - prices[prices.length - 1 - period]) / prices[prices.length - 1 - period]) * 100;
}

function calculateWilliamsR(prices: PriceData[], period: number = 14): number {
  const slice = prices.slice(-period);
  const high = Math.max(...slice.map(p => p.high));
  const low = Math.min(...slice.map(p => p.low));
  const close = prices[prices.length - 1].close;
  return -100 * (high - close) / (high - low);
}

export function scoreStock(symbol: string, name: string, sector: string, prices: PriceData[]): StockScore {
  const indicators = calculateAdvancedIndicators(prices);
  const currentPrice = prices[prices.length - 1].close;

  // Momentum score (0-100)
  const momentumScore = calculateMomentumScore(indicators);

  // Trend score (0-100)
  const trendScore = calculateTrendScore(indicators, currentPrice);

  // Volatility score (0-100) - lower volatility is better
  const volatilityScore = calculateVolatilityScore(indicators);

  // Volume score (0-100)
  const volumeScore = calculateVolumeScore(prices);

  // Overall score (weighted average)
  const score = (momentumScore * 0.3 + trendScore * 0.4 + volatilityScore * 0.15 + volumeScore * 0.15);

  // Buy signal
  const buySignal = generateBuySignal(indicators, currentPrice);

  return {
    symbol,
    name,
    sector,
    price: currentPrice,
    score: Math.round(score),
    momentum: Math.round(momentumScore),
    trend: Math.round(trendScore),
    volatility: Math.round(volatilityScore),
    volume: Math.round(volumeScore),
    buySignal,
    indicators,
  };
}

function calculateMomentumScore(ind: Indicators): number {
  let score = 50;
  
  // RSI: 30-70 is neutral, <30 is oversold (good), >70 is overbought (bad)
  if (ind.rsi < 30) score += 20;
  else if (ind.rsi < 50) score += 10;
  else if (ind.rsi > 70) score -= 20;
  else if (ind.rsi > 50) score -= 10;

  // MACD: positive histogram is bullish
  if (ind.macdHistogram > 0) score += 15;
  else score -= 15;

  // ROC: positive is bullish
  if (ind.roc > 0) score += 10;
  else score -= 10;

  // Stochastic: <20 is oversold, >80 is overbought
  if (ind.stochasticK < 20) score += 10;
  else if (ind.stochasticK > 80) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function calculateTrendScore(ind: Indicators, price: number): number {
  let score = 50;

  // Price vs moving averages
  if (price > ind.sma20 && ind.sma20 > ind.sma50 && ind.sma50 > ind.sma200) score += 30; // Strong uptrend
  else if (price > ind.sma20 && ind.sma20 > ind.sma50) score += 20; // Uptrend
  else if (price > ind.sma50) score += 10; // Weak uptrend
  else if (price < ind.sma20 && ind.sma20 < ind.sma50 && ind.sma50 < ind.sma200) score -= 30; // Strong downtrend
  else if (price < ind.sma20 && ind.sma20 < ind.sma50) score -= 20; // Downtrend
  else if (price < ind.sma50) score -= 10; // Weak downtrend

  // EMA trend
  if (ind.ema12 > ind.ema26) score += 10;
  else score -= 10;

  // ADX: >25 indicates strong trend
  if (ind.adx > 25) score += 10;

  return Math.max(0, Math.min(100, score));
}

function calculateVolatilityScore(ind: Indicators): number {
  // Lower volatility is better for stability
  // ATR as percentage of price
  const atrPercent = (ind.atr / ind.bollingerMiddle) * 100;
  
  if (atrPercent < 2) return 90;
  if (atrPercent < 3) return 75;
  if (atrPercent < 5) return 60;
  if (atrPercent < 8) return 40;
  return 20;
}

function calculateVolumeScore(prices: PriceData[]): number {
  const recentVolumes = prices.slice(-20).map(p => p.volume);
  const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  const currentVolume = prices[prices.length - 1].volume;
  
  const volumeRatio = currentVolume / avgVolume;
  
  if (volumeRatio > 1.5) return 90;
  if (volumeRatio > 1.2) return 75;
  if (volumeRatio > 0.8) return 60;
  return 40;
}

function generateBuySignal(ind: Indicators, price: number): string {
  const signals = [];

  if (ind.rsi < 30) signals.push('Oversold');
  if (ind.macdHistogram > 0 && ind.macd > ind.macdSignal) signals.push('MACD Bullish');
  if (price > ind.sma20 && ind.sma20 > ind.sma50) signals.push('Golden Cross');
  if (ind.stochasticK < 20) signals.push('Stochastic Oversold');
  if (ind.adx > 25) signals.push('Strong Trend');
  if (ind.cci < -100) signals.push('CCI Oversold');

  if (signals.length >= 3) return 'STRONG BUY';
  if (signals.length >= 2) return 'BUY';
  if (signals.length >= 1) return 'WEAK BUY';
  return 'HOLD';
}