import axios from "axios";

const AVANZA_API = "https://www.avanza.se/api";

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
}

interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function getStockData(symbol: string): Promise<StockData> {
  try {
    const response = await axios.get(`${AVANZA_API}/stock/${symbol}`);
    const data = response.data;
    return {
      symbol,
      name: data.name,
      price: data.lastPrice,
      change: data.change,
      changePercent: data.changePercent,
      volume: data.totalVolumeTraded,
      high: data.highestPrice,
      low: data.lowestPrice,
      open: data.openPrice,
    };
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    throw error;
  }
}

export async function getHistoricalData(
  symbol: string,
  days: number = 365
): Promise<HistoricalData[]> {
  try {
    const response = await axios.get(
      `${AVANZA_API}/stock/${symbol}/chart/day?days=${days}`
    );
    return response.data.dataPoints.map((point: any) => ({
      date: new Date(point.x).toISOString().split("T")[0],
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume,
    }));
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    throw error;
  }
}

export async function searchStocks(query: string): Promise<any[]> {
  try {
    const response = await axios.get(`${AVANZA_API}/search?query=${query}`);
    return response.data.results.filter((r: any) => r.type === "stock");
  } catch (error) {
    console.error("Error searching stocks:", error);
    throw error;
  }
}