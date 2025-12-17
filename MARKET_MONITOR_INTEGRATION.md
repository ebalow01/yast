# Market Monitor Integration Guide

## Files Created

1. **Backend API**: `market_monitor_api.py` - Flask API server
2. **React Component**: `yast-react/src/components/MarketMonitor.tsx` - Market Monitor tab component
3. **Python Monitor**: `market_monitor.py` - Already exists

---

## Step 1: Install Dependencies

```bash
# Install Flask and Flask-CORS for the API
pip install flask flask-cors

# In yast-react directory (if needed):
# npm install (dependencies should already be installed)
```

---

## Step 2: Start the Backend API

```bash
# From the yast directory
python market_monitor_api.py
```

This will start the Flask server on `http://localhost:5000`

You should see:
```
======================================================================
Market Monitor API Server
======================================================================
Starting Flask server on http://localhost:5000
Endpoints:
  GET /api/market-conditions - Get current market data
  GET /api/health - Health check
======================================================================
```

---

## Step 3: Integrate into React Dashboard

### 3.1 Import the MarketMonitor Component

At the top of `yast-react/src/components/DividendAnalysisDashboard.tsx`, add:

```typescript
import MarketMonitor from './MarketMonitor';
import { Assessment } from '@mui/icons-material';  // Icon for market monitor tab
```

### 3.2 Add New Tab

Find the `<Tabs>` section (around line 3271) and add a new Tab component after the last existing tab:

```typescript
<Tab
  label="Market Monitor"
  icon={<Assessment />}
  iconPosition="start"
  sx={{
    minHeight: 72,
    '& .MuiSvgIcon-root': {
      fontSize: 20
    }
  }}
/>
```

### 3.3 Add Tab Panel Content

Find where the tab panels are rendered (after line 3330) and add after the last `{selectedTab === X && (...)}` block:

```typescript
{selectedTab === 4 && (
  <Box sx={{ p: 3 }}>
    <MarketMonitor />
  </Box>
)}
```

**Note**: Adjust the number `4` if you have more or fewer tabs. Count from 0.

---

## Step 4: Test the Integration

### 4.1 Start Backend
```bash
python market_monitor_api.py
```

### 4.2 Start React Dev Server
```bash
cd yast-react
npm run dev
```

### 4.3 Open Browser
Navigate to your React app (usually `http://localhost:5173`)

You should now see a new "Market Monitor" tab!

---

## Troubleshooting

### CORS Errors
If you see CORS errors in the browser console:
- Make sure `flask-cors` is installed: `pip install flask-cors`
- The API has CORS enabled by default

### API Connection Errors
If the React app can't connect to the API:
- Make sure the Flask server is running on port 5000
- Check if the URL in `MarketMonitor.tsx` matches your API URL (default: `http://localhost:5000`)

### "Market monitor API not running" Error
- Start the Flask API: `python market_monitor_api.py`
- Wait a few seconds for the server to start
- Click the "Refresh" button in the Market Monitor tab

---

## What It Does

The Market Monitor tab displays:

1. **Fear & Greed Index** (0-100)
   - Visual gauge with color coding
   - Category (Extreme Fear, Fear, Neutral, Greed, Extreme Greed)

2. **VIX (Volatility Index)**
   - Current value
   - Status (Low, Normal, Elevated, High)

3. **VOO Current Price**
   - Real-time market price

4. **Strategy Recommendation**
   - Personalized strategy based on current market conditions
   - Specific action items
   - Expected profit potential

5. **Active Alerts**
   - Extreme Fear alerts (F&G < 20)
   - Extreme Greed warnings (F&G > 80)
   - VIX spike alerts (VIX > 30)

---

## Auto-Refresh

The Market Monitor automatically refreshes every 5 minutes. You can also manually refresh using the "Refresh" button.

---

## Production Deployment

For production, you'll want to:

1. **Deploy the Flask API** to a cloud service (Heroku, AWS, etc.)
2. **Update the API URL** in `MarketMonitor.tsx` to point to your production API
3. **Add authentication** if needed for security

Example environment variable approach:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

Then in `.env.production`:
```
VITE_API_URL=https://your-api-domain.com
```

---

## Next Steps

Once integrated, you can:
- Monitor market conditions in real-time alongside your dividend analysis
- Get alerted when extreme fear hits (time to get aggressive!)
- Track VIX spikes for volatility plays
- Follow systematic strategy recommendations

**Run `python market_monitor.py` from command line to see CLI version anytime!**
