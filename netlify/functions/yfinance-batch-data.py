#!/usr/bin/env python3
"""
Netlify serverless function to fetch dividend data from yfinance
Replaces Polygon.io with yfinance for more up-to-date dividend information
"""

import json
import yfinance as yf
from datetime import datetime
import traceback


def handler(event, context):
    """
    Netlify serverless function handler

    Expected input (POST body):
    {
        "tickers": ["HOOW", "ULTY", "QDTE", ...]
    }

    Returns:
    {
        "HOOW": {
            "medianDividend": 1.827,
            "lastDividends": [1.827, 2.183, 1.488],
            "lastDividendDate": "2025-10-20",
            "lastDividendAmount": 1.488,
            "totalDividends": 52
        },
        ...
    }
    """

    # Handle CORS
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    }

    # Handle OPTIONS request for CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }

    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        tickers = body.get('tickers', [])

        if not tickers:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'No tickers provided'})
            }

        # Fetch data for each ticker
        results = {}

        for ticker in tickers:
            try:
                # Fetch dividend data from yfinance
                stock = yf.Ticker(ticker)
                dividends = stock.dividends

                if dividends is None or dividends.empty:
                    results[ticker] = {
                        'error': 'No dividend data available',
                        'medianDividend': 0,
                        'lastDividends': [],
                        'lastDividendDate': None,
                        'lastDividendAmount': 0,
                        'totalDividends': 0
                    }
                    continue

                # Get last 3 dividends for median calculation
                last_3 = dividends.tail(3)
                median_dividend = float(last_3.median())
                last_3_list = [float(x) for x in last_3.tolist()]

                # Get latest dividend info
                last_date = dividends.index[-1]
                last_amount = float(dividends.iloc[-1])

                # Format date
                if hasattr(last_date, 'strftime'):
                    last_date_str = last_date.strftime('%Y-%m-%d')
                else:
                    last_date_str = str(last_date)

                results[ticker] = {
                    'medianDividend': median_dividend,
                    'lastDividends': last_3_list,
                    'lastDividendDate': last_date_str,
                    'lastDividendAmount': last_amount,
                    'totalDividends': len(dividends)
                }

            except Exception as e:
                # Handle errors for individual tickers
                results[ticker] = {
                    'error': f'Error fetching {ticker}: {str(e)}',
                    'medianDividend': 0,
                    'lastDividends': [],
                    'lastDividendDate': None,
                    'lastDividendAmount': 0,
                    'totalDividends': 0
                }

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(results)
        }

    except Exception as e:
        # Handle general errors
        error_trace = traceback.format_exc()
        print(f"Error in yfinance-batch-data: {error_trace}")

        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': f'Server error: {str(e)}',
                'trace': error_trace
            })
        }
