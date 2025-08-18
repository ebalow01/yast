# CLAUDE.md - Project Instructions

## CRITICAL RULES

### ❌ NEVER USE MOCK DATA
- **NEVER create mock, simulated, or fake data**
- **ALWAYS use real API calls and live data**
- **ALWAYS fetch actual market data from APIs** 
- When implementing features that require data, use real data sources
- If APIs are unavailable, clearly state the limitation rather than creating mock data
- Mock data creates false expectations and misleads users

### Real Data Sources
- Use Polygon API for real market data
- Use Claude API for real AI analysis
- Use actual ETF data from the dashboard
- Always verify data is current and accurate

## Project Context
This is a dividend ETF analysis dashboard that provides real-time market insights and AI-powered analysis for investment decisions. All data must be accurate and current since users rely on it for actual trading decisions.

## Development Guidelines
- Prioritize data accuracy over development speed
- Always validate API responses
- Handle errors gracefully with meaningful messages
- Use proper error handling for all external API calls