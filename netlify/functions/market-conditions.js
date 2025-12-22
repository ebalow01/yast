// Netlify serverless function for market conditions
// Fetches Fear & Greed Index, VIX, and VOO price from real APIs
// Note: fetch is globally available in Netlify Functions (Node 18+)

// Helper function to get dates for API calls
function getDates() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  return {
    today: formatDate(today),
    yesterday: formatDate(yesterday)
  };
}

// Fetch CNN Fear & Greed Index
async function getFearGreedIndex() {
  try {
    const response = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Fear & Greed API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    const currentValue = Math.round(data.fear_and_greed.score); // Round to integer
    const rating = data.fear_and_greed.rating;

    let category = 'Neutral';
    let emoji = '😐';

    if (currentValue <= 25) {
      category = 'Extreme Fear';
      emoji = '😱';
    } else if (currentValue <= 45) {
      category = 'Fear';
      emoji = '😨';
    } else if (currentValue <= 55) {
      category = 'Neutral';
      emoji = '😐';
    } else if (currentValue <= 75) {
      category = 'Greed';
      emoji = '😃';
    } else {
      category = 'Extreme Greed';
      emoji = '🤑';
    }

    return {
      value: currentValue,
      rating: rating,
      category: category,
      emoji: emoji
    };
  } catch (error) {
    console.error('Error fetching Fear & Greed Index:', error);
    return null;
  }
}

// Fetch VIX from Polygon (falls back to Yahoo Finance if needed)
async function getVIX(apiKey) {
  const { today, yesterday } = getDates();

  // Try Polygon first if API key available
  if (apiKey) {
    try {
      const url = `https://api.polygon.io/v2/aggs/ticker/I:VIX/range/1/day/${yesterday}/${today}?apiKey=${apiKey}&adjusted=true&sort=desc&limit=1`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const vixValue = data.results[0].c;
        return {
          value: vixValue,
          category: vixValue < 15 ? 'Low' : vixValue < 25 ? 'Normal' : vixValue < 35 ? 'Elevated' : 'High',
          emoji: vixValue < 15 ? '😌' : vixValue < 25 ? '😐' : vixValue < 35 ? '😬' : '😰'
        };
      }
    } catch (error) {
      console.error('Polygon VIX fetch failed:', error);
    }
  }

  // Fallback to Yahoo Finance (free, no API key)
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d';
    const response = await fetch(url);
    const data = await response.json();

    if (data.chart && data.chart.result && data.chart.result[0]) {
      const quote = data.chart.result[0].indicators.quote[0];
      const vixValue = quote.close[quote.close.length - 1];

      return {
        value: vixValue,
        category: vixValue < 15 ? 'Low' : vixValue < 25 ? 'Normal' : vixValue < 35 ? 'Elevated' : 'High',
        emoji: vixValue < 15 ? '😌' : vixValue < 25 ? '😐' : vixValue < 35 ? '😬' : '😰'
      };
    }
  } catch (error) {
    console.error('Yahoo Finance VIX fetch failed:', error);
  }

  return null;
}

// Fetch VOO price from Polygon
async function getVOOPrice(apiKey) {
  if (!apiKey) {
    console.error('No Polygon API key provided');
    return null;
  }

  const { today, yesterday } = getDates();

  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/VOO/range/1/day/${yesterday}/${today}?apiKey=${apiKey}&adjusted=true&sort=desc&limit=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      return data.results[0].c; // Close price
    }
  } catch (error) {
    console.error('Error fetching VOO price:', error);
  }

  return null;
}

// Helper: Round strike to nearest $5 increment
function roundToStrike(price) {
  return Math.round(price / 5) * 5;
}

// Helper: Calculate strike price based on percentage
function calculateStrike(vooPrice, percentOTM) {
  const targetPrice = vooPrice * (1 + percentOTM / 100);
  return roundToStrike(targetPrice);
}

// Helper: Get next Friday from a given date
function getNextFriday(date) {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  result.setDate(result.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
  return result;
}

// Helper: Get the first Friday that is at least minDTE days out
function getExpirationDate(minDTE) {
  const today = new Date();
  let currentFriday = getNextFriday(today);

  // Find the first Friday that is at least minDTE days away
  for (let i = 0; i < 12; i++) { // Check up to 12 weeks
    const daysUntil = Math.floor((currentFriday - today) / (1000 * 60 * 60 * 24));

    if (daysUntil >= minDTE) {
      return { date: new Date(currentFriday), daysOut: daysUntil };
    }

    // Move to next Friday
    currentFriday.setDate(currentFriday.getDate() + 7);
  }

  return null;
}

// Helper: Format date as MM/DD/YYYY
function formatDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

// Helper: Format expiration date for display
function formatExpiration(expInfo) {
  if (!expInfo) return 'No expiration found';
  return `${formatDate(expInfo.date)} (${expInfo.daysOut} days)`;
}

// Get strategy recommendation based on market conditions (VIX-AWARE framework)
// Returns structured JSON for UI display with toggle functionality
function getStrategyRecommendation(fearGreed, vix, vooPrice) {
  if (!fearGreed || !vix) {
    return {
      zone: 'unknown',
      zoneTitle: 'Insufficient Data',
      vixNotice: null,
      primaryStrategies: [],
      alternateStrategies: [],
      note: 'Insufficient data for recommendation - Fear & Greed or VIX unavailable'
    };
  }

  const fgValue = fearGreed.value;
  const vixValue = vix.value;

  // Use vooPrice if available, otherwise use a placeholder for percentage-only display
  const hasPrice = vooPrice && vooPrice > 0;
  const price = hasPrice ? vooPrice : 600; // Fallback for calculation structure

  // VIX ADJUSTMENT: VIX drives premium, adjust zone based on actual volatility
  let adjustedZone = 'unknown';

  if (fgValue <= 25) {
    adjustedZone = vixValue >= 25 ? 'extreme-fear' : 'fear';
  } else if (fgValue <= 45) {
    if (vixValue >= 25) adjustedZone = 'extreme-fear';
    else if (vixValue >= 18) adjustedZone = 'fear';
    else adjustedZone = 'neutral';
  } else if (fgValue <= 55) {
    if (vixValue >= 20) adjustedZone = 'fear';
    else if (vixValue >= 13) adjustedZone = 'neutral';
    else adjustedZone = 'greed';
  } else if (fgValue <= 75) {
    adjustedZone = vixValue >= 18 ? 'neutral' : 'greed';
  } else {
    adjustedZone = 'extreme-greed';
  }

  // VIX adjustment notice
  let vixNotice = null;
  if (fgValue <= 25 && vixValue < 25) {
    vixNotice = '⚠️ VIX ADJUSTMENT: F&G shows Extreme Fear but VIX is LOW (' + vixValue.toFixed(1) + '). Premium environment = FEAR zone.';
  } else if (fgValue <= 45 && vixValue < 18) {
    vixNotice = '⚠️ VIX ADJUSTMENT: F&G shows Fear but VIX is LOW (' + vixValue.toFixed(1) + '). Premium environment = NEUTRAL zone.';
  } else if (fgValue <= 45 && vixValue >= 25) {
    vixNotice = '🔥 VIX UPGRADE: F&G shows Fear but VIX is ELEVATED (' + vixValue.toFixed(1) + '). Premium environment = EXTREME FEAR!';
  } else if (fgValue <= 55 && vixValue >= 20) {
    vixNotice = '📈 VIX UPGRADE: F&G shows Neutral but VIX is ELEVATED (' + vixValue.toFixed(1) + '). Premium environment = FEAR zone.';
  } else if (fgValue <= 55 && vixValue < 13) {
    vixNotice = '💤 VIX ADJUSTMENT: F&G shows Neutral but VIX is LOW (' + vixValue.toFixed(1) + '). Premium environment = GREED zone.';
  }

  // EXTREME FEAR - Typical VIX: 25-40+
  if (adjustedZone === 'extreme-fear') {
    // Calculate strikes for extreme fear zone (put ladders)
    const putStrike1_1 = calculateStrike(price, -8.0);  // 8% below
    const putStrike1_2 = calculateStrike(price, -10.0); // 10% below
    const putStrike1_3 = calculateStrike(price, -12.0); // 12% below
    const putStrike2_1 = calculateStrike(price, -5.0);  // 5% below
    const putStrike2_2 = calculateStrike(price, -8.0);  // 8% below
    const putStrike2_3 = calculateStrike(price, -12.0); // 12% below
    const putStrike3Low = calculateStrike(price, -7.0); // 7% below
    const putStrike3High = calculateStrike(price, -5.0); // 5% below

    // Calculate expiration dates - first Friday at least X days out
    const putExpiration1 = getExpirationDate(45);
    const putExpiration2 = getExpirationDate(30);
    const putExpiration3 = getExpirationDate(7);

    return {
      zone: 'extreme-fear',
      zoneTitle: `🚨 EXTREME FEAR ZONE (F&G ${fgValue}) - VIX ${vixValue.toFixed(1)} | GO AGGRESSIVE`,
      vixNotice,
      primaryStrategies: [],
      alternateStrategies: [
        {
          name: 'Deep Discount Put Ladder',
          successRate: '75-85%',
          requiresCash: true,
          requiresShares: false,
          action: 'Sell cash-secured puts in 3 tranches',
          strike: hasPrice
            ? `$${putStrike1_1} / $${putStrike1_2} / $${putStrike1_3} (8%/10%/12% below $${price.toFixed(2)})`
            : `8% / 10% / 12% below current`,
          dte: formatExpiration(putExpiration1),
          position: 'Deploy 100% cash (40%/35%/25% split)',
          roll: 'If untested at 21 DTE + 50% profit → close & resell',
          goal: 'Massive premium OR generational entry prices'
        },
        {
          name: 'Opportunistic Put Ladder',
          successRate: '60-70%',
          requiresCash: true,
          requiresShares: false,
          action: 'Multiple strikes for price diversification',
          strike: hasPrice
            ? `$${putStrike2_1} / $${putStrike2_2} / $${putStrike2_3} (5%/8%/12% below $${price.toFixed(2)})`
            : `5% / 8% / 12% below current`,
          dte: formatExpiration(putExpiration2),
          position: 'Split cash equally across 3 strikes',
          roll: 'Roll down & out if VOO drops further (collect credit)',
          goal: 'Average down cost basis, offset 3-6% via premium'
        },
        {
          name: 'Short-DTE Aggressive Puts',
          successRate: '80-90%',
          requiresCash: true,
          requiresShares: false,
          action: 'Weekly put selling during peak panic',
          strike: hasPrice
            ? `$${putStrike3Low}-$${putStrike3High} (5-7% below $${price.toFixed(2)})`
            : `5-7% below current`,
          dte: formatExpiration(putExpiration3),
          position: '30-50% cash, redeploy weekly',
          roll: 'Take assignment or let expire (no rolls)',
          goal: 'Rapid premium accumulation (8-15% annualized)'
        }
      ],
      note: '⚠️ MANDATORY: Close ALL covered calls. Deploy cash NOW. Premium is 2-4x normal. This is YOUR opportunity.'
    };
  }

  // FEAR - Typical VIX: 18-25
  if (adjustedZone === 'fear') {
    // Calculate strikes for fear zone
    const ccStrikeLow = calculateStrike(price, 3.0);   // 3% OTM
    const ccStrikeHigh = calculateStrike(price, 4.0);  // 4% OTM
    const putStrike1Low = calculateStrike(price, -6.0); // 6% below
    const putStrike1High = calculateStrike(price, -4.0); // 4% below
    const putStrike2Low = calculateStrike(price, -5.0); // 5% below
    const putStrike2High = calculateStrike(price, -3.0); // 3% below

    // Calculate expiration dates - first Friday at least X days out
    const ccExpiration = getExpirationDate(21);
    const putExpiration1 = getExpirationDate(30);
    const putExpiration2 = getExpirationDate(45);

    return {
      zone: 'fear',
      zoneTitle: `➕ FEAR ZONE (F&G ${fgValue}) - VIX ${vixValue.toFixed(1)} | BALANCED AGGRESSION`,
      vixNotice,
      primaryStrategies: [
        {
          name: 'Conservative Covered Calls',
          successRate: '55-65%',
          requiresCash: false,
          requiresShares: true,
          action: 'Sell covered calls (if holding VOO)',
          strike: hasPrice
            ? `$${ccStrikeLow}-$${ccStrikeHigh} (3-4% OTM from $${price.toFixed(2)})`
            : `3-4% OTM`,
          dte: formatExpiration(ccExpiration),
          position: '50% of VOO holdings (keep 50% uncapped)',
          roll: 'If challenged, roll up & out for credit',
          goal: 'Capture premium while maintaining upside exposure'
        }
      ],
      alternateStrategies: [
        {
          name: 'Balanced Put Selling',
          successRate: '70-80%',
          requiresCash: true,
          requiresShares: false,
          action: 'Sell cash-secured puts',
          strike: hasPrice
            ? `$${putStrike1Low}-$${putStrike1High} (4-6% below $${price.toFixed(2)})`
            : `4-6% below current`,
          dte: formatExpiration(putExpiration1),
          position: '60-80% of available cash',
          roll: 'If tested, roll down $5-10 & out 2-3 weeks (credit)',
          goal: '1.5-2x normal premium with moderate assignment risk'
        },
        {
          name: 'Put Wheel Preparation',
          successRate: '65-75%',
          requiresCash: true,
          requiresShares: false,
          action: 'Sell puts with intention to own',
          strike: hasPrice
            ? `$${putStrike2Low}-$${putStrike2High} (3-5% below $${price.toFixed(2)})`
            : `3-5% below current`,
          dte: formatExpiration(putExpiration2),
          position: '100% of cash earmarked for VOO',
          roll: 'Take assignment → immediately sell covered calls',
          goal: '"Buy VOO with discount coupon" (collect 1.5-2.5%)'
        }
      ],
      note: '💡 Fear often precedes sharp rallies. Position for recovery.'
    };
  }

  // NEUTRAL - Typical VIX: 13-18
  if (adjustedZone === 'neutral') {
    // Calculate strikes for neutral zone
    const ccStrikeLow = calculateStrike(price, 2.0);   // 2% OTM
    const ccStrikeHigh = calculateStrike(price, 2.5);  // 2.5% OTM
    const putStrikeLow = calculateStrike(price, -3.0);  // 3% below
    const putStrikeHigh = calculateStrike(price, -2.0); // 2% below

    // Calculate expiration dates - first Friday at least X days out
    const ccExpiration = getExpirationDate(14);     // At least 14 days
    const putExpiration = getExpirationDate(30);    // At least 30 days

    // Format strike display based on whether we have real price
    const strikeDisplay = hasPrice
      ? `$${ccStrikeLow}-$${ccStrikeHigh} (2-2.5% OTM from $${price.toFixed(2)})`
      : `2-2.5% OTM (price unavailable)`;
    const putStrikeDisplay = hasPrice
      ? `$${putStrikeLow}-$${putStrikeHigh} (2-3% below $${price.toFixed(2)})`
      : `2-3% below current (price unavailable)`;

    return {
      zone: 'neutral',
      zoneTitle: `➡️ NEUTRAL ZONE (F&G ${fgValue}) - VIX ${vixValue.toFixed(1)} | INCOME MODE`,
      vixNotice,
      primaryStrategies: [
        {
          name: 'Bi-Weekly Covered Calls',
          successRate: '70-75%',
          requiresCash: false,
          requiresShares: true,
          action: 'Sell covered calls on VOO holdings',
          strike: strikeDisplay,
          dte: formatExpiration(ccExpiration),
          position: '75-100% of VOO holdings',
          roll: 'If within 0.5% of strike at 7 DTE → roll up $5, out 2wks',
          goal: '0.4-0.7% per cycle = 12-18% annualized income'
        }
      ],
      alternateStrategies: [
        {
          name: 'Strategic Put Selling',
          successRate: '75-85%',
          requiresCash: true,
          requiresShares: false,
          action: 'Sell puts to accumulate additional VOO',
          strike: putStrikeDisplay,
          dte: formatExpiration(putExpiration),
          position: '40-60% of available cash',
          roll: 'If untested at 21 DTE + 50% profit → close & resell',
          goal: 'Accumulate VOO at discount or 3-5% annualized on cash'
        },
        {
          name: 'Simultaneous Calls + Puts',
          successRate: '60-70%',
          requiresCash: true,
          requiresShares: true,
          action: 'Sell covered calls AND cash-secured puts',
          strike: hasPrice
            ? `Calls: $${calculateStrike(price, 3.0)} (3% OTM) | Puts: $${calculateStrike(price, -3.0)} (3% below)`
            : `Calls: 3% OTM | Puts: 3% below`,
          dte: formatExpiration(putExpiration),
          position: 'Calls on 100% holdings, puts with 50% cash',
          roll: 'Manage each leg independently',
          goal: 'Maximum premium in range-bound market (6% range)'
        }
      ],
      note: '✅ Autopilot mode. Collect steady income from time decay.'
    };
  }

  // GREED - Typical VIX: 11-14
  if (adjustedZone === 'greed') {
    // Calculate strikes for greed zone
    const ccStrike1Low = calculateStrike(price, 1.5);  // 1.5% OTM
    const ccStrike1High = calculateStrike(price, 2.0); // 2% OTM
    const ccStrike2 = calculateStrike(price, 1.0);     // 1% OTM
    const putStrikeLow = calculateStrike(price, -2.0); // 2% below
    const putStrikeHigh = calculateStrike(price, -1.0); // 1% below

    // Calculate expiration dates - first Friday at least X days out
    const ccExpiration1 = getExpirationDate(14);
    const ccExpiration2 = getExpirationDate(5);
    const putExpiration = getExpirationDate(14);

    return {
      zone: 'greed',
      zoneTitle: `😊 GREED ZONE (F&G ${fgValue}) - VIX ${vixValue.toFixed(1)} | CAPITAL PRESERVATION`,
      vixNotice,
      primaryStrategies: [
        {
          name: 'Tight Covered Calls',
          successRate: '40-50%',
          requiresCash: false,
          requiresShares: true,
          action: 'Sell covered calls to lock gains',
          strike: hasPrice
            ? `$${ccStrike1Low}-$${ccStrike1High} (1.5-2% OTM from $${price.toFixed(2)})`
            : `1.5-2% OTM`,
          dte: formatExpiration(ccExpiration1),
          position: '100% of VOO holdings',
          roll: 'If assigned → sell puts 2-3% below assignment price',
          goal: 'Lock gains (cap upside at 1.5-2%), protect against 5-10% correction'
        },
        {
          name: 'Weekly Covered Calls',
          successRate: '50-60%',
          requiresCash: false,
          requiresShares: true,
          action: 'Sell weekly covered calls',
          strike: hasPrice
            ? `$${ccStrike2} (1% OTM from $${price.toFixed(2)})`
            : `1% OTM`,
          dte: formatExpiration(ccExpiration2),
          position: '50% of holdings (keep 50% uncapped)',
          roll: 'Take assignment on half, keep other half',
          goal: 'Rapid theta decay while limiting opportunity cost'
        }
      ],
      alternateStrategies: [
        {
          name: 'Minimal Put Selling',
          successRate: '85-90%',
          requiresCash: true,
          requiresShares: false,
          action: 'Sell puts ONLY if holding 100% cash',
          strike: hasPrice
            ? `$${putStrikeLow}-$${putStrikeHigh} (1-2% below $${price.toFixed(2)})`
            : `1-2% below current`,
          dte: formatExpiration(putExpiration),
          position: 'Maximum 30% of available cash',
          roll: 'Avoid rolls - take assignment if needed',
          goal: 'Low premiums (0.2-0.4%), only deploy if waiting to add'
        }
      ],
      note: '⚠️ Greed phases end abruptly. Prepare for reversal.'
    };
  }

  // EXTREME GREED - Typical VIX: 9-12
  if (adjustedZone === 'extreme-greed') {
    // Calculate strikes for extreme greed zone
    const ccStrike1Low = calculateStrike(price, 0.5);  // 0.5% OTM
    const ccStrike1High = calculateStrike(price, 1.0); // 1% OTM
    const ccStrike2Low = calculateStrike(price, -0.5); // 0.5% ITM
    const ccStrike2High = calculateStrike(price, 0.5); // 0.5% OTM

    // Calculate expiration dates - first Friday at least X days out
    const ccExpiration1 = getExpirationDate(7);
    const ccExpiration2 = getExpirationDate(5);

    return {
      zone: 'extreme-greed',
      zoneTitle: `🛑 EXTREME GREED ZONE (F&G ${fgValue}) - VIX ${vixValue.toFixed(1)} | DEFENSIVE EXIT`,
      vixNotice,
      primaryStrategies: [
        {
          name: 'Aggressive Covered Calls',
          successRate: '30-40%',
          requiresCash: false,
          requiresShares: true,
          action: 'Sell covered calls on ALL holdings',
          strike: hasPrice
            ? `$${ccStrike1Low}-$${ccStrike1High} (0.5-1% OTM from $${price.toFixed(2)})`
            : `0.5-1% OTM`,
          dte: formatExpiration(ccExpiration1),
          position: '100% of VOO holdings',
          roll: 'DO NOT ROLL - take assignment & move to cash',
          goal: 'Lock gains. Assignment = successful profit-taking'
        },
        {
          name: 'ATM/ITM Weekly Calls',
          successRate: '15-25%',
          requiresCash: false,
          requiresShares: true,
          action: 'Sell ATM or slightly ITM weekly calls',
          strike: hasPrice
            ? `$${ccStrike2Low}-$${ccStrike2High} (ATM from $${price.toFixed(2)})`
            : `ATM (at current price)`,
          dte: formatExpiration(ccExpiration2),
          position: '100% of holdings',
          roll: 'Take assignment immediately - do NOT chase',
          goal: '"Sell signal in disguise." Exit near peak.'
        }
      ],
      alternateStrategies: [
        {
          name: 'Zero Put Selling',
          successRate: '100%',
          requiresCash: true,
          requiresShares: false,
          action: 'DO NOT sell puts',
          strike: 'N/A - Risk/reward terrible (0.1-0.2% premium)',
          dte: 'N/A - Wait for fear cycle',
          position: 'Hold 100% cash in reserve',
          roll: 'N/A',
          goal: 'Capital preservation. Wait for inevitable correction.'
        }
      ],
      note: '🚨 Extreme greed precedes corrections 80%+ of time. GET OUT. Redeploy when F&G drops below 55.'
    };
  }

  return {
    zone: 'unknown',
    zoneTitle: 'Monitor Market Conditions',
    vixNotice: null,
    primaryStrategies: [],
    alternateStrategies: [],
    note: '➡️ Monitor Fear & Greed Index for strategy selection'
  };
}

// Check for alerts (3-step system focused)
function checkAlerts(fearGreed, vix) {
  const alerts = [];

  // STEP 2 TRIGGER ALERT
  if (fearGreed && fearGreed.value <= 20) {
    alerts.push("🚨 STEP 2 TRIGGERED! Fear & Greed at " + fearGreed.value + " - CLOSE ALL COVERED CALLS. SELL CASH-SECURED PUTS 5-10% BELOW. NO CHOICE - GO AGGRESSIVE NOW!");
  }

  // STEP 2 WARNING ALERT
  if (fearGreed && fearGreed.value > 20 && fearGreed.value <= 25) {
    alerts.push("⚠️ STEP 2 APPROACHING: Fear & Greed at " + fearGreed.value + " - Prepare cash. Review current calls. Could trigger soon!");
  }

  // HIGH VIX ALERT (enhanced premium opportunity)
  if (vix && vix.value >= 30) {
    alerts.push("🌋 EXTREME VOLATILITY: VIX at " + vix.value.toFixed(2) + " - Premium is MASSIVE. If Step 2 triggers, assignment prices will be excellent.");
  }

  // COMBO ALERT: Extreme Fear + High VIX
  if (fearGreed && vix && fearGreed.value <= 25 && vix.value >= 25) {
    alerts.push("💎 MAXIMUM OPPORTUNITY ZONE: Fear + High VIX = This is the April 2025 scenario. Execute Step 2 with confidence!");
  }

  // EXTREME GREED - possible Step 3 scenario or take profits
  if (fearGreed && fearGreed.value >= 80) {
    alerts.push("🔔 EXTREME GREED: Market at " + fearGreed.value + " - If in Step 3 recovery, keep selling calls. If not assigned, sell aggressive ITM calls!");
  }

  // LOW PREMIUM ENVIRONMENT
  if (vix && vix.value < 12) {
    alerts.push("💤 LOW VOLATILITY: VIX " + vix.value.toFixed(2) + " - Step 1 premiums lower than usual. Still collect, but don't expect big payouts.");
  }

  return alerts;
}

// Main Netlify Function handler
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Get Polygon API key from environment variable
    const polygonApiKey = process.env.POLYGON_API_KEY;

    // Fetch all data in parallel
    console.log('Fetching market data...');
    const [fearGreed, vix, vooPrice] = await Promise.all([
      getFearGreedIndex(),
      getVIX(polygonApiKey),
      getVOOPrice(polygonApiKey)
    ]);

    console.log('Data fetched:', {
      fearGreed: fearGreed ? 'OK' : 'NULL',
      vix: vix ? 'OK' : 'NULL',
      vooPrice: vooPrice ? 'OK' : 'NULL'
    });

    // Generate recommendation and alerts
    const recommendation = getStrategyRecommendation(fearGreed, vix, vooPrice);
    const alerts = checkAlerts(fearGreed, vix);

    // Build response
    const responseData = {
      success: true,
      data: {
        fearGreedIndex: fearGreed,
        vix: vix,
        vooPrice: vooPrice,
        recommendation: recommendation,
        alerts: alerts,
        timestamp: new Date().toISOString()
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    };

  } catch (error) {
    console.error('Error in market-conditions function:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch market conditions',
        message: error.message
      })
    };
  }
};
