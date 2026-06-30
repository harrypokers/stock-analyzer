import { Indicators, PricePoint } from "./indicators.js";

export interface Signal {
  type: string;
  confidence: number;
  description: string;
  action: "BUY" | "SELL" | "HOLD";
}

export function analyzePatterns(data: PricePoint[], indicators: Indicators): Signal[] {
  const signals: Signal[] = [];

  if (indicators.rsi < 30) {
    signals.push({
      type: "RSI_OVERSOLD",
      confidence: Math.min(100, (30 - indicators.rsi) * 3),
      description: `RSI is oversold at ${indicators.rsi.toFixed(2)}`,
      action: "BUY",
    });
  } else if (indicators.rsi > 70) {
    signals.push({
      type: "RSI_OVERBOUGHT",
      confidence: Math.min(100, (indicators.rsi - 70) * 3),
      description: `RSI is overbought at ${indicators.rsi.toFixed(2)}`,
      action: "SELL",
    });
  }

  if (indicators.macd > indicators.macdSignal && indicators.macdHistogram > 0) {
    signals.push({
      type: "MACD_BULLISH",
      confidence: Math.min(100, Math.abs(indicators.macdHistogram) * 100),
      description: "MACD bullish crossover",
      action: "BUY",
    });
  } else if (indicators.macd < indicators.macdSignal && indicators.macdHistogram < 0) {
    signals.push({
      type: "MACD_BEARISH",
      confidence: Math.min(100, Math.abs(indicators.macdHistogram) * 100),
      description: "MACD bearish crossover",
      action: "SELL",
    });
  }

  const currentPrice = data[data.length - 1].close;
  if (currentPrice > indicators.sma20 && indicators.sma20 > indicators.sma50 && indicators.sma50 > indicators.sma200) {
    signals.push({
      type: "GOLDEN_CROSS",
      confidence: 85,
      description: "Price above all major moving averages (bullish trend)",
      action: "BUY",
    });
  } else if (currentPrice < indicators.sma20 && indicators.sma20 < indicators.sma50 && indicators.sma50 < indicators.sma200) {
    signals.push({
      type: "DEATH_CROSS",
      confidence: 85,
      description: "Price below all major moving averages (bearish trend)",
      action: "SELL",
    });
  }

  if (currentPrice < indicators.bollingerLower) {
    signals.push({
      type: "BOLLINGER_LOWER_TOUCH",
      confidence: 70,
      description: "Price touched lower Bollinger Band (potential bounce)",
      action: "BUY",
    });
  } else if (currentPrice > indicators.bollingerUpper) {
    signals.push({
      type: "BOLLINGER_UPPER_TOUCH",
      confidence: 70,
      description: "Price touched upper Bollinger Band (potential pullback)",
      action: "SELL",
    });
  }

  if (indicators.stochasticK < 20) {
    signals.push({
      type: "STOCHASTIC_OVERSOLD",
      confidence: (20 - indicators.stochasticK) * 2.5,
      description: `Stochastic oversold at ${indicators.stochasticK.toFixed(2)}`,
      action: "BUY",
    });
  } else if (indicators.stochasticK > 80) {
    signals.push({
      type: "STOCHASTIC_OVERBOUGHT",
      confidence: (indicators.stochasticK - 80) * 2.5,
      description: `Stochastic overbought at ${indicators.stochasticK.toFixed(2)}`,
      action: "SELL",
    });
  }

  if (data.length > 1) {
    const avgVolume = data.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
    const currentVolume = data[data.length - 1].volume;
    if (currentVolume > avgVolume * 1.5) {
      signals.push({
        type: "HIGH_VOLUME",
        confidence: Math.min(100, (currentVolume / avgVolume) * 30),
        description: `Volume spike detected (${(currentVolume / avgVolume).toFixed(2)}x average)`,
        action: "BUY",
      });
    }
  }

  if (data.length >= 3) {
    const recent = data.slice(-3);
    const isLowerLow = recent[2].low < recent[1].low && recent[1].low < recent[0].low;
    const isHigherHigh = recent[2].high > recent[1].high && recent[1].high > recent[0].high;

    if (isHigherHigh) {
      signals.push({
        type: "HIGHER_HIGHS",
        confidence: 75,
        description: "Higher highs pattern detected (uptrend)",
        action: "BUY",
      });
    } else if (isLowerLow) {
      signals.push({
        type: "LOWER_LOWS",
        confidence: 75,
        description: "Lower lows pattern detected (downtrend)",
        action: "SELL",
      });
    }
  }

  return signals;
}

export function calculateSignalStrength(signals: Signal[]): number {
  if (signals.length === 0) return 0;
  const buySignals = signals.filter((s) => s.action === "BUY");
  const sellSignals = signals.filter((s) => s.action === "SELL");
  const avgBuyConfidence = buySignals.length > 0 ? buySignals.reduce((sum, s) => sum + s.confidence, 0) / buySignals.length : 0;
  const avgSellConfidence = sellSignals.length > 0 ? sellSignals.reduce((sum, s) => sum + s.confidence, 0) / sellSignals.length : 0;
  return avgBuyConfidence - avgSellConfidence;
}