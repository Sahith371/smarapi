const express = require('express');
const smartApiService = require('../services/smartApiService');
const { requireSmartApiToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// @desc    Search instruments/stocks
// @route   GET /api/market/search
// @access  Private
router.get('/search', requireSmartApiToken, asyncHandler(async (req, res) => {
  const { q: searchText, exchange = 'NSE' } = req.query;

  if (!searchText || searchText.length < 2) {
    throw new AppError('Search text must be at least 2 characters', 400);
  }

  const result = await smartApiService.searchInstruments(
    req.user.smartApiTokens.accessToken,
    exchange,
    searchText
  );

  if (!result.success) {
    throw new AppError(result.message || 'Search failed', 400);
  }

  res.json({
    success: true,
    data: {
      instruments: result.data || [],
      searchText,
      exchange
    }
  });
}));

// @desc    Get LTP (Last Traded Price) for multiple instruments
// @route   POST /api/market/ltp
// @access  Private
router.post('/ltp', requireSmartApiToken, asyncHandler(async (req, res) => {
  const { instruments } = req.body;

  if (!instruments || !Array.isArray(instruments) || instruments.length === 0) {
    throw new AppError('Please provide instruments array', 400);
  }

  if (instruments.length > 50) {
    throw new AppError('Maximum 50 instruments allowed per request', 400);
  }

  const ltpPromises = instruments.map(async (instrument) => {
    const { exchange, tradingSymbol, symbolToken } = instrument;
    
    if (!exchange || !tradingSymbol || !symbolToken) {
      return {
        ...instrument,
        error: 'Missing required fields: exchange, tradingSymbol, symbolToken'
      };
    }

    try {
      const result = await smartApiService.getLTP(
        req.user.smartApiTokens.accessToken,
        exchange,
        tradingSymbol,
        symbolToken
      );

      if (result.success && result.data) {
        return {
          ...instrument,
          ltp: result.data.ltp,
          open: result.data.open,
          high: result.data.high,
          low: result.data.low,
          close: result.data.close,
          lastUpdated: new Date()
        };
      } else {
        return {
          ...instrument,
          error: result.message || 'Failed to fetch LTP'
        };
      }
    } catch (error) {
      return {
        ...instrument,
        error: 'Request failed'
      };
    }
  });

  const results = await Promise.all(ltpPromises);

  res.json({
    success: true,
    data: {
      instruments: results,
      timestamp: new Date()
    }
  });
}));

// @desc    Get historical data for charting
// @route   GET /api/market/historical/:exchange/:symbolToken
// @access  Private
router.get('/historical/:exchange/:symbolToken', requireSmartApiToken, asyncHandler(async (req, res) => {
  const { exchange, symbolToken } = req.params;
  const { 
    interval = 'ONE_DAY', 
    fromDate, 
    toDate = new Date().toISOString().split('T')[0] 
  } = req.query;

  // Validate interval
  const validIntervals = [
    'ONE_MINUTE', 'THREE_MINUTE', 'FIVE_MINUTE', 'TEN_MINUTE', 'FIFTEEN_MINUTE',
    'THIRTY_MINUTE', 'ONE_HOUR', 'ONE_DAY'
  ];

  if (!validIntervals.includes(interval)) {
    throw new AppError(`Invalid interval. Valid intervals: ${validIntervals.join(', ')}`, 400);
  }

  // Set default fromDate if not provided (30 days ago for intraday, 1 year for daily)
  let defaultFromDate;
  if (interval === 'ONE_DAY') {
    defaultFromDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
  } else {
    defaultFromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  }

  const from = fromDate || defaultFromDate.toISOString().split('T')[0];

  const result = await smartApiService.getHistoricalData(
    req.user.smartApiTokens.accessToken,
    exchange,
    symbolToken,
    interval,
    from,
    toDate
  );

  if (!result.success) {
    throw new AppError(result.message || 'Failed to fetch historical data', 400);
  }

  // Transform data for charting libraries
  const chartData = result.data ? result.data.map(candle => ({
    timestamp: candle[0], // timestamp
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseInt(candle[5])
  })) : [];

  res.json({
    success: true,
    data: {
      candles: chartData,
      interval,
      fromDate: from,
      toDate,
      exchange,
      symbolToken,
      count: chartData.length
    }
  });
}));

// @desc    Get market depth/order book
// @route   GET /api/market/depth/:exchange/:symbolToken
// @access  Private
router.get('/depth/:exchange/:symbolToken', requireSmartApiToken, asyncHandler(async (req, res) => {
  const { exchange, symbolToken } = req.params;

  // Note: SmartAPI doesn't have a direct market depth endpoint
  // This would typically require WebSocket connection for real-time data
  // For now, we'll return LTP data with a note about market depth
  
  const result = await smartApiService.getLTP(
    req.user.smartApiTokens.accessToken,
    exchange,
    'DUMMY', // This would need the actual trading symbol
    symbolToken
  );

  if (!result.success) {
    throw new AppError(result.message || 'Failed to fetch market data', 400);
  }

  res.json({
    success: true,
    data: {
      ltp: result.data,
      note: 'Full market depth requires WebSocket connection',
      exchange,
      symbolToken
    }
  });
}));

// @desc    Get top gainers/losers
// @route   GET /api/market/movers
// @access  Private
router.get('/movers', requireSmartApiToken, asyncHandler(async (req, res) => {
  const { type = 'gainers', exchange = 'NSE', limit = 10 } = req.query;

  // Note: SmartAPI doesn't provide direct top gainers/losers endpoint
  // This would typically require maintaining a list of popular stocks
  // and fetching their LTP data to calculate percentage changes
  
  // For demo purposes, returning a structure that would contain this data
  const demoData = {
    gainers: [
      {
        symbol: 'RELIANCE',
        exchange: 'NSE',
        ltp: 2450.50,
        change: 45.30,
        changePercent: 1.88,
        volume: 1234567
      },
      {
        symbol: 'TCS',
        exchange: 'NSE',
        ltp: 3650.75,
        change: 32.25,
        changePercent: 0.89,
        volume: 987654
      }
    ],
    losers: [
      {
        symbol: 'HDFC',
        exchange: 'NSE',
        ltp: 1580.25,
        change: -25.75,
        changePercent: -1.60,
        volume: 876543
      }
    ]
  };

  res.json({
    success: true,
    data: {
      movers: demoData[type] || [],
      type,
      exchange,
      limit: parseInt(limit),
      note: 'This endpoint requires additional implementation with stock universe data'
    }
  });
}));

// @desc    Get market status
// @route   GET /api/market/status
// @access  Private
router.get('/status', requireSmartApiToken, asyncHandler(async (req, res) => {
  // Market hours for Indian exchanges
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
  const currentHour = parseInt(currentTime.split(':')[0]);
  const currentMinute = parseInt(currentTime.split(':')[1]);
  
  // NSE/BSE market hours: 9:15 AM to 3:30 PM IST
  const marketStartHour = 9;
  const marketStartMinute = 15;
  const marketEndHour = 15;
  const marketEndMinute = 30;
  
  const isMarketOpen = (
    (currentHour > marketStartHour || (currentHour === marketStartHour && currentMinute >= marketStartMinute)) &&
    (currentHour < marketEndHour || (currentHour === marketEndHour && currentMinute <= marketEndMinute))
  );
  
  // Check if it's a weekend
  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  
  const marketStatus = isMarketOpen && !isWeekend ? 'OPEN' : 'CLOSED';
  
  res.json({
    success: true,
    data: {
      status: marketStatus,
      currentTime: currentTime,
      timezone: 'Asia/Kolkata',
      exchanges: {
        NSE: {
          status: marketStatus,
          openTime: '09:15',
          closeTime: '15:30'
        },
        BSE: {
          status: marketStatus,
          openTime: '09:15',
          closeTime: '15:30'
        }
      },
      isWeekend,
      lastUpdated: new Date()
    }
  });
}));

// @desc    Get popular stocks/watchlist
// @route   GET /api/market/popular
// @access  Private
router.get('/popular', requireSmartApiToken, asyncHandler(async (req, res) => {
  const { category = 'nifty50', exchange = 'NSE' } = req.query;

  // Popular stocks by category
  const popularStocks = {
    nifty50: [
      { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', symbolToken: '2885' },
      { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', symbolToken: '11536' },
      { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', symbolToken: '1333' },
      { symbol: 'INFY', name: 'Infosys Ltd', symbolToken: '1594' },
      { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', symbolToken: '1394' },
      { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', symbolToken: '4963' },
      { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', symbolToken: '1922' },
      { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', symbolToken: '10604' },
      { symbol: 'ITC', name: 'ITC Ltd', symbolToken: '1660' },
      { symbol: 'SBIN', name: 'State Bank of India', symbolToken: '3045' }
    ],
    banking: [
      { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', symbolToken: '1333' },
      { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', symbolToken: '4963' },
      { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', symbolToken: '1922' },
      { symbol: 'SBIN', name: 'State Bank of India', symbolToken: '3045' },
      { symbol: 'AXISBANK', name: 'Axis Bank Ltd', symbolToken: '5900' }
    ],
    it: [
      { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', symbolToken: '11536' },
      { symbol: 'INFY', name: 'Infosys Ltd', symbolToken: '1594' },
      { symbol: 'WIPRO', name: 'Wipro Ltd', symbolToken: '3787' },
      { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', symbolToken: '7229' },
      { symbol: 'TECHM', name: 'Tech Mahindra Ltd', symbolToken: '13538' }
    ]
  };

  const stocks = popularStocks[category] || popularStocks.nifty50;

  res.json({
    success: true,
    data: {
      stocks: stocks.map(stock => ({
        ...stock,
        exchange
      })),
      category,
      exchange,
      count: stocks.length
    }
  });
}));

module.exports = router;
