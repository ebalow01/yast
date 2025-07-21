export interface Asset {
  symbol: string;
  name: string;
  totalReturn: number;
  risk: number;
  dividendCapture: number;
  isRule1: boolean;
  isRule2: boolean;
}

export const assets: Asset[] = [
  {
    symbol: 'ULTY',
    name: 'YieldMax ULTRA Option Income Strategy ETF',
    totalReturn: 75.2,
    risk: 37.8,
    dividendCapture: 45.3,
    isRule1: false,
    isRule2: true
  },
  {
    symbol: 'YMAX',
    name: 'YieldMax S&P 500 Option Income Strategy ETF',
    totalReturn: 45.3,
    risk: 28.9,
    dividendCapture: 38.7,
    isRule1: true,
    isRule2: true
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    totalReturn: 15.74,
    risk: 20.5,
    dividendCapture: 2.1,
    isRule1: false,
    isRule2: false
  }
];
