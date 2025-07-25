// Enhanced TypeScript interfaces for improved dividend capture dashboard
// Supports advanced risk metrics, tax tracking, and enhanced visualizations

// Core dividend data interface - enhanced from existing DividendData
export interface EnhancedDividendData {
  // Core identification
  ticker: string;
  tradingDays: number;
  exDivDay: string;
  
  // Returns and performance
  buyHoldReturn: number;
  divCaptureReturn: number;
  bestStrategy: 'B&H' | 'DC';
  bestReturn: number;
  finalValue: number;
  dcWinRate: number;
  
  // Risk metrics (existing + enhanced)
  riskVolatility: number;
  medianDividend: number;
  forwardYield?: number;
  category: 'top-performers' | 'mid-performers' | 'low-performers' | 'excluded' | 'benchmark';
  
  // NEW: Enhanced risk metrics
  riskMetrics: RiskMetrics;
  
  // NEW: Liquidity metrics
  liquidityMetrics: LiquidityMetrics;
  
  // NEW: Tax efficiency metrics
  taxMetrics: TaxMetrics;
  
  // NEW: Enhanced yield calculations
  yieldMetrics: YieldMetrics;
}

// Risk metrics including VaR and advanced calculations
export interface RiskMetrics {
  // Value at Risk calculations
  var95: number;        // 95% VaR (1-day)
  var99: number;        // 99% VaR (1-day)
  expectedShortfall: number; // Expected shortfall (Conditional VaR)
  
  // Risk-adjusted returns
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  
  // Volatility metrics
  annualizedVolatility: number;
  downwardVolatility: number;
  uptrendVolatility: number;
  
  // Drawdown analysis
  maxDrawdown: number;
  averageDrawdown: number;
  drawdownDuration: number; // in trading days
  
  // Beta and correlation
  betaVsSPY: number;
  correlationVsSPY: number;
  
  // Risk scoring
  riskScore: number;    // Composite risk score (0-100)
  riskCategory: 'Low' | 'Medium' | 'High' | 'Very High';
}

// Liquidity and market microstructure metrics
export interface LiquidityMetrics {
  // Volume and liquidity
  averageDailyVolume: number;
  dollarVolume: number;
  
  // Spread metrics
  bidAskSpread: number;
  bidAskSpreadPercent: number;
  
  // Market impact
  estimatedMarketImpact: number; // For $10k trade
  
  // Liquidity scoring
  liquidityScore: number; // 0-100 composite score
  liquidityCategory: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  
  // Trading costs
  estimatedTradingCost: number; // Total cost including spread + impact
}

// Tax efficiency and tracking metrics
export interface TaxMetrics {
  // Tax efficiency ratios
  taxEfficiencyRatio: number; // After-tax return / pre-tax return
  
  // Distribution analysis
  qualifiedDividendPercent: number;
  ordinaryIncomePercent: number;
  capitalGainsPercent: number;
  
  // Wash sale risk analysis
  washSaleRisk: 'Low' | 'Medium' | 'High';
  washSaleIndicators: WashSaleIndicator[];
  
  // Tax optimization
  taxOptimizedHoldingPeriod: number; // Optimal holding period in days
  shortTermCapitalGainsRisk: number; // 0-1 probability
  
  // Tax bracket impact
  effectiveTaxRate: number; // Estimated for different brackets
  afterTaxReturn: number;
  
  // 1099 estimate
  estimatedTaxableIncome: number; // Per $10k investment
}

// Wash sale detection indicators
export interface WashSaleIndicator {
  date: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  reason: string;
  impactOnReturns: number;
}

// Enhanced yield calculations and projections
export interface YieldMetrics {
  // Current yield metrics
  currentYield: number;
  distributionYield: number;
  secYield: number; // SEC standardized yield if available
  
  // Forward-looking yields
  forwardYield: number;
  projectedAnnualYield: number;
  yieldVolatility: number;
  
  // Yield consistency
  yieldConsistencyScore: number; // 0-100
  averageYieldGrowth: number; // Historical average growth
  
  // Distribution analysis
  distributionFrequency: 'Weekly' | 'Monthly' | 'Quarterly' | 'Irregular';
  averageDistributionAmount: number;
  distributionGrowthRate: number;
  
  // Sustainability metrics
  payoutRatio: number;
  coverageRatio: number;
  sustainabilityScore: number; // 0-100
}

// Portfolio allocation with enhanced metadata
export interface EnhancedAllocation {
  ticker: string;
  weight: number;
  return: number;
  risk: number;
  sharpe?: number;
  
  // NEW: Enhanced allocation metadata
  allocationReason: AllocationReason;
  riskContribution: number; // Contribution to portfolio risk
  returnContribution: number; // Contribution to portfolio return
  diversificationBenefit: number; // Diversification score
  
  // Confidence and quality metrics
  confidenceScore: number; // 0-100
  dataQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  lastUpdated: string;
}

// Reasons for allocation decisions
export type AllocationReason = 
  | 'high_return_low_risk'      // Rule 1: >40% return AND <40% risk
  | 'high_dividend_capture'     // Rule 2: >30% dividend capture
  | 'risk_diversification'      // Added for risk diversification
  | 'sharpe_optimization'       // Added for Sharpe ratio optimization
  | 'cash_position'            // Cash allocation
  | 'benchmark_comparison';     // SPY benchmark

// Portfolio metrics with enhanced analysis
export interface EnhancedPortfolioMetrics {
  // Core metrics (existing)
  expectedReturn: number;
  risk: number;
  sharpeRatio: number;
  
  // NEW: Enhanced portfolio metrics
  sortinoRatio: number;
  calmarRatio: number;
  informationRatio: number;
  
  // Risk decomposition
  systematicRisk: number;
  specificRisk: number;
  concentrationRisk: number;
  
  // Diversification metrics
  diversificationRatio: number;
  effectiveNumberOfAssets: number;
  portfolioTurnover: number;
  
  // Tax and cost analysis
  estimatedTaxDrag: number;
  totalExpenseRatio: number;
  estimatedTradingCosts: number;
  
  // Performance attribution
  alphaGeneration: number;
  betaExposure: number;
  
  // Scenario analysis
  stressTestResults: StressTestResult[];
  
  // Quality scores
  overallScore: number; // 0-100 composite score
  confidence: number;   // Confidence in projections
}

// Stress testing results
export interface StressTestResult {
  scenario: string;
  returnImpact: number;
  riskImpact: number;
  probability: number;
}

// Market timing and dividend capture analysis
export interface DividendTimingAnalysis {
  ticker: string;
  
  // Optimal timing
  optimalEntryDate: string;
  optimalExitDate: string;
  holdingPeriod: number;
  
  // Market timing efficiency
  timingAlpha: number; // Alpha from timing vs buy & hold
  timingVolatility: number; // Additional volatility from timing
  
  // Execution risk
  executionRisk: 'Low' | 'Medium' | 'High';
  slippageEstimate: number;
  
  // Success probabilities
  profitProbability: number;
  outperformanceProbability: number; // vs buy & hold
}

// Dashboard state and configuration
export interface DashboardState {
  selectedTab: number;
  timeframe: '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL';
  riskTolerance: 'Conservative' | 'Moderate' | 'Aggressive';
  taxBracket: number; // Marginal tax rate
  
  // Filters and preferences
  filters: DashboardFilters;
  displayPreferences: DisplayPreferences;
  
  // Real-time data
  lastDataUpdate: string;
  dataFreshness: 'Live' | 'Delayed' | 'Stale';
}

// Dashboard filtering options
export interface DashboardFilters {
  minReturn: number;
  maxRisk: number;
  minLiquidity: number;
  excludeHighTaxImpact: boolean;
  onlyQualifiedDividends: boolean;
  
  // Sector and strategy filters
  allowedStrategies: Array<'B&H' | 'DC'>;
  excludedSectors?: string[];
  
  // Ex-dividend day preferences
  preferredExDivDays?: string[];
}

// Display and UI preferences
export interface DisplayPreferences {
  showAdvancedMetrics: boolean;
  defaultSortColumn: string;
  defaultSortDirection: 'asc' | 'desc';
  
  // Visualization preferences
  chartType: 'line' | 'bar' | 'scatter' | 'heatmap';
  colorScheme: 'default' | 'colorblind' | 'high-contrast';
  
  // Density and layout
  tableSize: 'compact' | 'standard' | 'comfortable';
  showTooltips: boolean;
}

// Error handling and validation
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  message: string;
  impact: 'low' | 'medium' | 'high';
}

// API response and data loading
export interface ApiResponse<T> {
  data: T;
  metadata: {
    timestamp: string;
    source: string;
    confidence: number;
    freshness: 'live' | 'cached' | 'stale';
  };
  errors?: ApiError[];
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

// Export utility type for backward compatibility
export type LegacyDividendData = {
  ticker: string;
  tradingDays: number;  
  exDivDay: string;
  buyHoldReturn: number;
  divCaptureReturn: number;
  bestStrategy: string;
  bestReturn: number;
  finalValue: number;
  dcWinRate: number;
  riskVolatility: number;
  medianDividend: number;
  forwardYield?: number;
  currentPrice?: number;
  lastDividend?: number;
  category: 'top-performers' | 'mid-performers' | 'low-performers' | 'excluded' | 'benchmark';
};