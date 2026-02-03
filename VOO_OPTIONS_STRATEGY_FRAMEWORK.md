# SPY Covered Call Strategy

**Mechanical daily-check covered call system on SPY**

Backtest: Feb 2021 - Jan 2026 | Starting Capital: $750,000
Return: +175.18% | Sharpe: 1.17 | Sortino: 1.54 | Max Drawdown: -16.61%

---

## Setup

Buy as many 100-share lots of SPY as affordable. Sell 0.30 delta calls at 21 DTE against every 100 shares.

---

## Daily Management Rules (Priority Order)

### Priority 1: Roll Up and Out
**Trigger:** SPY within 1% of call strike or above it
**Action:** Roll to 0.30 delta strike at 30 DTE. New strike >= old strike + $1. Skip if DTE < 1.

### Priority 2: Roll Out at DTE
**Trigger:** DTE <= 7 and not caught by Priority 1
**Action:** Roll to same-or-higher strike at 30 DTE. New strike = max(current strike, 0.30 delta strike at 30 DTE).

### Priority 3: Roll at Profit Target
**Trigger:** Position decayed 80% (kept 80% of premium)
**Action:** Roll to fresh 0.30 delta call at 21 DTE. This is a roll, not close+reopen.

### Priority 4: Reinvest
**Trigger:** Available cash >= SPY price x 100
**Action:** Buy another 100 shares, then sell a call against them.

### Priority 5: New Entry
**Trigger:** Any 100 shares not covered by a call
**Action:** Sell 0.30 delta call at 21 DTE.

---

## Parameters

| Parameter | Value |
|---|---|
| Target Delta | 0.30 |
| Target DTE (new entries) | 21 days |
| Roll Target DTE | 30 days |
| Roll-Up Threshold | 1% |
| Roll DTE Trigger | 7 days |
| Profit Target | 80% |
| Max Positions | 20 |

---

## Design Decisions

- **Roll at profit target, don't close+reopen:** Eliminates gap days. Worth +10pp return.
- **1% roll-up threshold (not 2%):** Fewer unnecessary transactions.
- **Always reinvest:** Compounding added +30pp over 5 years.
- **30 delta:** Sweet spot between premium and upside participation.
- **21 DTE new / 30 DTE rolls:** Fast theta on new entries, meaningful credit on rolls.

---

## Informational Indicators

Fear & Greed Index and VIX are displayed alongside this strategy as informational context. They do not change the strategy rules. High VIX means richer premiums on rolls; low VIX means thinner premiums but the mechanical rules remain the same.

---

**Last Updated:** 2026-02-02
**Framework Version:** 2.0
