import axios from "axios";

interface StockData {
  name: string;
  symbol: string;
}

interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const mockStocks: { [key: string]: StockData } = {
  TESLA: { name: "Tesla Inc", symbol: "TESLA" },
  AAPL: { name: "Apple Inc", symbol: "AAPL" },
  MSFT: { name: "Microsoft Corporation", symbol: "MSFT" },
  GOOGL: { name: "Alphabet Inc", symbol: "GOOGL" },
  AMZN: { name: "Amazon.com Inc", symbol: "AMZN" },
};

export async function searchStocks(query: string): Promise<StockData[]> {
  const q = query.toUpperCase();
  const results = Object.values(mockStocks).filter(
    (stock) =>
      stock.symbol.includes(q) || stock.name.toUpperCase().includes(q)
  );
  return results.length > 0 ? results : [{ name: query, symbol: q }];
}

export async function getStockData(symbol: string): Promise<StockData> {
  const stock = mockStocks[symbol.toUpperCase()];
  return stock || { name: symbol, symbol: symbol.toUpperCase() };
}

export async function getHistoricalData(
  symbol: string,
  days: number
): Promise<PriceData[]> {
  const data: PriceData[] = [];
  const now = new Date();

  for (let i = days; i > 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const basePrice = 100 + Math.random() * 200;
    const volatility = 0.02;

    const open = basePrice + (Math.random() - 0.5) * basePrice * volatility;
    const close = open + (Math.random() - 0.5) * basePrice * volatility;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(Math.random() * 10000000) + 1000000;

    data.push({
      date: date.toISOString().split("T")[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });
  }

  return data;
}