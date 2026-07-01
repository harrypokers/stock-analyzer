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

interface Signal {
  type: string;
  confidence: number;
  description: string;
  action: string;
}

export function analyzePatterns(
  prices: PriceData[],
  indicators: Indicators
): Signal[] {
  const signals: Signal[] = [];
  const currentPrice = prices[prices.length - 1].close;

  // RSI signals
  if (indicators.rsi < 30) {
    signals.push({
      type: "RSI Oversold",
      confidence: 75,
      description: "RSI below 30 indicates oversold conditions",
      action: "BUY",
    });
  } else if (indicators.rsi > 70) {
    signals.push({
      type: "RSI Overbought",
      confidence: 75,
      description: "RSI above 70 indicates overbought conditions",
      action: "SELL",
    });
  }

  // MACD signals
  if (indicators.macdHistogram > 0 && indicators.macd > indicators.macdSignal) {
    signals.push({
      type: "MACD Bullish",
      confidence: 70,
      description: "MACD above signal line with positive histogram",
      action: "BUY",
    });
  } else if (
    indicators.macdHistogram < 0 &&
    indicators.macd < indicators.macdSignal
  ) {
    signals.push({
      type: "MACD Bearish",
      confidence: 70,
      description: "MACD below signal line with negative histogram",
      action: "SELL",
    });
  }

  // Moving average signals
  if (currentPrice > indicators.sma20 && indicators.sma20 > indicators.sma50) {
    signals.push({
      type: "Golden Cross",
      confidence: 80,
      description: "Price above SMA20, SMA20 above SMA50",
      action: "BUY",
    });
  } else if (
    currentPrice < indicators.sma20 &&
    indicators.sma20 < indicators.sma50
  ) {
    signals.push({
      type: "Death Cross",
      confidence: 80,
      description: "Price below SMA20, SMA20 below SMA50",
      action: "SELL",
    });
  }

  // Bollinger Bands signals
  if (currentPrice < indicators.bollingerLower) {
    signals.push({
      type: "Bollinger Lower Band",
      confidence: 65,
      description: "Price touched lower Bollinger Band",
      action: "BUY",
    });
  } else if (currentPrice > indicators.bollingerUpper) {
    signals.push({
      type: "Bollinger Upper Band",
      confidence: 65,
      description: "Price touched upper Bollinger Band",
      action: "SELL",
    });
  }

  return signals.length > 0
    ? signals
    : [
        {
          type: "Neutral",
          confidence: 50,
          description: "No clear trading signals detected",
          action: "HOLD",
        },
      ];
}

export function calculateSignalStrength(signals: Signal[]): string {
  if (signals.length === 0) return "NEUTRAL";

  const buyCount = signals.filter((s) => s.action === "BUY").length;
  const sellCount = signals.filter((s) => s.action === "SELL").length;

  if (buyCount > sellCount) return "BULLISH";
  if (sellCount > buyCount) return "BEARISH";
  return "NEUTRAL";
}