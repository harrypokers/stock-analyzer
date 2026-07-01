export interface Position {
  symbol: string;
  shares: number;
  entryPrice: number;
  entryDate: string;
  currentPrice: number;
  value: number;
  gain: number;
  gainPercent: number;
}

export interface PortfolioState {
  id: string;
  cash: number;
  totalValue: number;
  positions: Position[];
  trades: Trade[];
  createdAt: string;
  lastUpdated: string;
  performanceHistory: PerformanceSnapshot[];
}

export interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  date: string;
  reason: string;
  portfolioValueBefore: number;
  portfolioValueAfter: number;
}

export interface PerformanceSnapshot {
  date: string;
  totalValue: number;
  cash: number;
  gainLoss: number;
  gainLossPercent: number;
  positionCount: number;
}

export interface PortfolioMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  winRate: number;
  averageGain: number;
  averageLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
}

const INITIAL_CAPITAL = 100000;
const MAX_POSITION_SIZE = 0.1; // 10% of portfolio per position
const MIN_CONFIDENCE = 60; // Minimum signal confidence to trade

export function createPortfolio(): PortfolioState {
  return {
    id: 'portfolio-' + Date.now(),
    cash: INITIAL_CAPITAL,
    totalValue: INITIAL_CAPITAL,
    positions: [],
    trades: [],
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    performanceHistory: [
      {
        date: new Date().toISOString(),
        totalValue: INITIAL_CAPITAL,
        cash: INITIAL_CAPITAL,
        gainLoss: 0,
        gainLossPercent: 0,
        positionCount: 0,
      },
    ],
  };
}

export function executeTradeSignal(
  portfolio: PortfolioState,
  symbol: string,
  signal: string,
  confidence: number,
  currentPrice: number
): Trade | null {
  if (confidence < MIN_CONFIDENCE) {
    return null;
  }

  const now = new Date().toISOString();

  // Check if we already have a position
  const existingPosition = portfolio.positions.find((p) => p.symbol === symbol);

  if (signal === 'STRONG BUY' || signal === 'BUY') {
    // Buy signal
    if (existingPosition && existingPosition.shares > 0) {
      // Already holding, skip
      return null;
    }

    // Calculate position size (risk management)
    const maxRiskAmount = portfolio.totalValue * MAX_POSITION_SIZE;
    const sharesToBuy = Math.floor(maxRiskAmount / currentPrice);

    if (sharesToBuy <= 0 || sharesToBuy * currentPrice > portfolio.cash) {
      return null; // Not enough cash
    }

    const cost = sharesToBuy * currentPrice;

    // Execute buy
    portfolio.cash -= cost;

    if (existingPosition) {
      existingPosition.shares += sharesToBuy;
      existingPosition.entryPrice =
        (existingPosition.entryPrice * (existingPosition.shares - sharesToBuy) +
          currentPrice * sharesToBuy) /
        existingPosition.shares;
      existingPosition.entryDate = now;
    } else {
      portfolio.positions.push({
        symbol,
        shares: sharesToBuy,
        entryPrice: currentPrice,
        entryDate: now,
        currentPrice,
        value: cost,
        gain: 0,
        gainPercent: 0,
      });
    }

    const trade: Trade = {
      id: 'trade-' + Date.now(),
      symbol,
      type: 'BUY',
      shares: sharesToBuy,
      price: currentPrice,
      date: now,
      reason: `${signal} signal (${confidence}% confidence)`,
      portfolioValueBefore: portfolio.totalValue,
      portfolioValueAfter: portfolio.totalValue - cost,
    };

    portfolio.trades.push(trade);
    updatePortfolioValue(portfolio, currentPrice);
    return trade;
  } else if (signal === 'SELL') {
    // Sell signal
    if (!existingPosition || existingPosition.shares === 0) {
      return null; // No position to sell
    }

    const proceeds = existingPosition.shares * currentPrice;
    const gain = proceeds - existingPosition.shares * existingPosition.entryPrice;

    // Execute sell
    portfolio.cash += proceeds;
    existingPosition.shares = 0;
    existingPosition.value = 0;
    existingPosition.gain = gain;
    existingPosition.gainPercent = (gain / (existingPosition.entryPrice * existingPosition.shares)) * 100 || 0;

    const trade: Trade = {
      id: 'trade-' + Date.now(),
      symbol,
      type: 'SELL',
      shares: existingPosition.shares,
      price: currentPrice,
      date: now,
      reason: `${signal} signal (${confidence}% confidence)`,
      portfolioValueBefore: portfolio.totalValue,
      portfolioValueAfter: portfolio.totalValue + proceeds,
    };

    portfolio.trades.push(trade);
    updatePortfolioValue(portfolio, currentPrice);
    return trade;
  }

  return null;
}

export function updatePortfolioValue(
  portfolio: PortfolioState,
  priceMap: { [symbol: string]: number } | number
): void {
  let totalPositionValue = 0;

  for (const position of portfolio.positions) {
    const price =
      typeof priceMap === 'number'
        ? priceMap
        : priceMap[position.symbol] || position.currentPrice;

    position.currentPrice = price;
    position.value = position.shares * price;
    position.gain = position.value - position.shares * position.entryPrice;
    position.gainPercent =
      position.shares > 0
        ? (position.gain / (position.shares * position.entryPrice)) * 100
        : 0;

    totalPositionValue += position.value;
  }

  portfolio.totalValue = portfolio.cash + totalPositionValue;
  portfolio.lastUpdated = new Date().toISOString();

  // Add to performance history
  const initialValue = INITIAL_CAPITAL;
  const gainLoss = portfolio.totalValue - initialValue;
  const gainLossPercent = (gainLoss / initialValue) * 100;

  portfolio.performanceHistory.push({
    date: new Date().toISOString(),
    totalValue: portfolio.totalValue,
    cash: portfolio.cash,
    gainLoss,
    gainLossPercent,
    positionCount: portfolio.positions.filter((p) => p.shares > 0).length,
  });
}

export function calculateMetrics(portfolio: PortfolioState): PortfolioMetrics {
  const initialValue = INITIAL_CAPITAL;
  const totalReturn = portfolio.totalValue - initialValue;
  const totalReturnPercent = (totalReturn / initialValue) * 100;

  // Win rate
  const closedTrades = portfolio.trades.filter((t) => t.type === 'SELL');
  const winningTrades = closedTrades.filter(
    (t) => t.portfolioValueAfter > t.portfolioValueBefore
  );
  const winRate =
    closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

  // Average gain/loss
  const gains = closedTrades
    .filter((t) => t.portfolioValueAfter > t.portfolioValueBefore)
    .map((t) => t.portfolioValueAfter - t.portfolioValueBefore);
  const losses = closedTrades
    .filter((t) => t.portfolioValueAfter < t.portfolioValueBefore)
    .map((t) => t.portfolioValueBefore - t.portfolioValueAfter);

  const averageGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / gains.length : 0;
  const averageLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  const profitFactor = averageLoss > 0 ? averageGain / averageLoss : 0;

  // Sharpe ratio (simplified)
  const returns = portfolio.performanceHistory.map((h) => h.gainLossPercent);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  // Max drawdown
  let maxDrawdown = 0;
  let peak = initialValue;
  for (const snapshot of portfolio.performanceHistory) {
    if (snapshot.totalValue > peak) {
      peak = snapshot.totalValue;
    }
    const drawdown = ((peak - snapshot.totalValue) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  // Best and worst trades
  let bestTrade: Trade | null = null;
  let worstTrade: Trade | null = null;
  let bestGain = -Infinity;
  let worstGain = Infinity;

  for (const trade of closedTrades) {
    const gain = trade.portfolioValueAfter - trade.portfolioValueBefore;
    if (gain > bestGain) {
      bestGain = gain;
      bestTrade = trade;
    }
    if (gain < worstGain) {
      worstGain = gain;
      worstTrade = trade;
    }
  }

  return {
    totalReturn,
    totalReturnPercent,
    winRate,
    averageGain,
    averageLoss,
    profitFactor,
    sharpeRatio,
    maxDrawdown,
    bestTrade,
    worstTrade,
  };
}