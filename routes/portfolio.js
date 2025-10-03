const express = require('express');
const Portfolio = require('../models/Portfolio');
const smartApiService = require('../services/smartApiService');
const { requireSmartApiToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// @desc    Get user portfolio
// @route   GET /api/portfolio
// @access  Private
router.get('/', requireSmartApiToken, asyncHandler(async (req, res) => {
  let portfolio = await Portfolio.findOne({ userId: req.user._id });

  if (!portfolio) {
    // Create empty portfolio if doesn't exist
    portfolio = await Portfolio.create({
      userId: req.user._id,
      holdings: [],
      totalInvestedValue: 0,
      totalCurrentValue: 0,
      totalPnL: 0,
      totalPnLPercentage: 0
    });
  }

  res.json({
    success: true,
    data: {
      portfolio: {
        ...portfolio.toObject(),
        summary: {
          totalHoldings: portfolio.holdings.length,
          totalInvestedValue: portfolio.totalInvestedValue,
          totalCurrentValue: portfolio.totalCurrentValue,
          totalPnL: portfolio.totalPnL,
          totalPnLPercentage: portfolio.totalPnLPercentage,
          availableFunds: portfolio.availableFunds,
          lastSyncAt: portfolio.lastSyncAt,
          syncStatus: portfolio.syncStatus
        }
      }
    }
  });
}));

// @desc    Sync portfolio with broker
// @route   POST /api/portfolio/sync
// @access  Private
router.post('/sync', requireSmartApiToken, asyncHandler(async (req, res) => {
  let portfolio = await Portfolio.findOne({ userId: req.user._id });

  if (!portfolio) {
    portfolio = await Portfolio.create({
      userId: req.user._id,
      holdings: []
    });
  }

  // Update sync status
  portfolio.syncStatus = 'syncing';
  await portfolio.save();

  try {
    // Fetch holdings from SmartAPI
    const holdingsResult = await smartApiService.getHoldings(
      req.user.smartApiTokens.accessToken
    );

    if (!holdingsResult.success) {
      portfolio.syncStatus = 'failed';
      await portfolio.save();
      throw new AppError(holdingsResult.message || 'Failed to sync portfolio', 400);
    }

    // Clear existing holdings
    portfolio.holdings = [];

    // Process holdings data
    if (holdingsResult.data && Array.isArray(holdingsResult.data)) {
      for (const holding of holdingsResult.data) {
        if (holding.quantity > 0) {
          portfolio.holdings.push({
            symbol: holding.tradingsymbol,
            exchange: holding.exchange,
            instrumentToken: holding.symboltoken,
            quantity: parseInt(holding.quantity),
            averagePrice: parseFloat(holding.averageprice || holding.price),
            currentPrice: parseFloat(holding.ltp || holding.price),
            lastUpdated: new Date()
          });
        }
      }
    }

    // Calculate totals
    portfolio.calculateTotals();
    portfolio.syncStatus = 'completed';
    portfolio.lastSyncAt = new Date();

    await portfolio.save();

    res.json({
      success: true,
      message: 'Portfolio synced successfully',
      data: {
        holdingsCount: portfolio.holdings.length,
        totalInvestedValue: portfolio.totalInvestedValue,
        totalCurrentValue: portfolio.totalCurrentValue,
        totalPnL: portfolio.totalPnL,
        totalPnLPercentage: portfolio.totalPnLPercentage,
        lastSyncAt: portfolio.lastSyncAt
      }
    });

  } catch (error) {
    portfolio.syncStatus = 'failed';
    await portfolio.save();
    throw error;
  }
}));

// @desc    Update current prices for portfolio holdings
// @route   POST /api/portfolio/update-prices
// @access  Private
router.post('/update-prices', requireSmartApiToken, asyncHandler(async (req, res) => {
  const portfolio = await Portfolio.findOne({ userId: req.user._id });

  if (!portfolio || portfolio.holdings.length === 0) {
    throw new AppError('No holdings found in portfolio', 404);
  }

  // Prepare instruments for LTP fetch
  const instruments = portfolio.holdings.map(holding => ({
    exchange: holding.exchange,
    tradingSymbol: holding.symbol,
    symbolToken: holding.instrumentToken
  }));

  // Fetch current prices in batches (SmartAPI has rate limits)
  const batchSize = 20;
  const priceUpdates = [];

  for (let i = 0; i < instruments.length; i += batchSize) {
    const batch = instruments.slice(i, i + batchSize);
    
    const ltpPromises = batch.map(async (instrument) => {
      try {
        const result = await smartApiService.getLTP(
          req.user.smartApiTokens.accessToken,
          instrument.exchange,
          instrument.tradingSymbol,
          instrument.symbolToken
        );

        if (result.success && result.data) {
          return {
            symbol: instrument.tradingSymbol,
            exchange: instrument.exchange,
            price: parseFloat(result.data.ltp)
          };
        }
        return null;
      } catch (error) {
        console.error(`Failed to fetch LTP for ${instrument.tradingSymbol}:`, error);
        return null;
      }
    });

    const batchResults = await Promise.all(ltpPromises);
    priceUpdates.push(...batchResults.filter(result => result !== null));

    // Add delay between batches to respect rate limits
    if (i + batchSize < instruments.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Update portfolio with new prices
  portfolio.updateCurrentPrices(priceUpdates);
  await portfolio.save();

  res.json({
    success: true,
    message: 'Portfolio prices updated successfully',
    data: {
      updatedCount: priceUpdates.length,
      totalHoldings: portfolio.holdings.length,
      totalCurrentValue: portfolio.totalCurrentValue,
      totalPnL: portfolio.totalPnL,
      totalPnLPercentage: portfolio.totalPnLPercentage,
      lastUpdated: new Date()
    }
  });
}));

// @desc    Get portfolio analytics
// @route   GET /api/portfolio/analytics
// @access  Private
router.get('/analytics', requireSmartApiToken, asyncHandler(async (req, res) => {
  const portfolio = await Portfolio.findOne({ userId: req.user._id });

  if (!portfolio) {
    throw new AppError('Portfolio not found', 404);
  }

  // Calculate analytics
  const { topGainers, topLosers } = portfolio.getTopMovers(5);
  
  // Holdings by exchange
  const holdingsByExchange = {};
  portfolio.holdings.forEach(holding => {
    if (!holdingsByExchange[holding.exchange]) {
      holdingsByExchange[holding.exchange] = {
        count: 0,
        investedValue: 0,
        currentValue: 0
      };
    }
    holdingsByExchange[holding.exchange].count++;
    holdingsByExchange[holding.exchange].investedValue += holding.quantity * holding.averagePrice;
    holdingsByExchange[holding.exchange].currentValue += holding.quantity * holding.currentPrice;
  });

  // Sector allocation (simplified - would need sector mapping)
  const sectorAllocation = {
    'Technology': 25.5,
    'Banking': 20.3,
    'Healthcare': 15.2,
    'Consumer Goods': 12.8,
    'Energy': 10.1,
    'Others': 16.1
  };

  // Performance metrics
  const performanceMetrics = {
    totalReturn: portfolio.totalPnL,
    totalReturnPercentage: portfolio.totalPnLPercentage,
    dayChange: 0, // Would need previous day's data
    dayChangePercentage: 0,
    bestPerformer: topGainers[0] || null,
    worstPerformer: topLosers[0] || null,
    diversificationScore: Math.min(portfolio.holdings.length * 10, 100) // Simplified score
  };

  res.json({
    success: true,
    data: {
      analytics: {
        summary: {
          totalHoldings: portfolio.holdings.length,
          totalInvestedValue: portfolio.totalInvestedValue,
          totalCurrentValue: portfolio.totalCurrentValue,
          totalPnL: portfolio.totalPnL,
          totalPnLPercentage: portfolio.totalPnLPercentage
        },
        topMovers: {
          gainers: topGainers,
          losers: topLosers
        },
        allocation: {
          byExchange: holdingsByExchange,
          bySector: sectorAllocation
        },
        performance: performanceMetrics,
        lastUpdated: portfolio.updatedAt
      }
    }
  });
}));

// @desc    Get holding details
// @route   GET /api/portfolio/holding/:symbol/:exchange
// @access  Private
router.get('/holding/:symbol/:exchange', requireSmartApiToken, asyncHandler(async (req, res) => {
  const { symbol, exchange } = req.params;
  
  const portfolio = await Portfolio.findOne({ userId: req.user._id });

  if (!portfolio) {
    throw new AppError('Portfolio not found', 404);
  }

  const holding = portfolio.holdings.find(
    h => h.symbol === symbol.toUpperCase() && h.exchange === exchange.toUpperCase()
  );

  if (!holding) {
    throw new AppError('Holding not found', 404);
  }

  // Get current LTP
  const ltpResult = await smartApiService.getLTP(
    req.user.smartApiTokens.accessToken,
    holding.exchange,
    holding.symbol,
    holding.instrumentToken
  );

  let currentPrice = holding.currentPrice;
  if (ltpResult.success && ltpResult.data) {
    currentPrice = parseFloat(ltpResult.data.ltp);
    
    // Update holding price
    holding.currentPrice = currentPrice;
    holding.lastUpdated = new Date();
    portfolio.calculateTotals();
    await portfolio.save();
  }

  res.json({
    success: true,
    data: {
      holding: {
        ...holding.toObject(),
        currentPrice,
        investedValue: holding.quantity * holding.averagePrice,
        currentValue: holding.quantity * currentPrice,
        pnl: (holding.quantity * currentPrice) - (holding.quantity * holding.averagePrice),
        pnlPercentage: holding.averagePrice > 0 ? 
          ((currentPrice - holding.averagePrice) / holding.averagePrice) * 100 : 0,
        lastUpdated: new Date()
      }
    }
  });
}));

// @desc    Add manual holding (for tracking purposes)
// @route   POST /api/portfolio/holding
// @access  Private
router.post('/holding', requireSmartApiToken, asyncHandler(async (req, res) => {
  const { symbol, exchange, instrumentToken, quantity, averagePrice } = req.body;

  if (!symbol || !exchange || !instrumentToken || !quantity || !averagePrice) {
    throw new AppError('Please provide all required fields', 400);
  }

  if (quantity <= 0 || averagePrice <= 0) {
    throw new AppError('Quantity and average price must be positive', 400);
  }

  let portfolio = await Portfolio.findOne({ userId: req.user._id });

  if (!portfolio) {
    portfolio = await Portfolio.create({
      userId: req.user._id,
      holdings: []
    });
  }

  // Get current price
  const ltpResult = await smartApiService.getLTP(
    req.user.smartApiTokens.accessToken,
    exchange,
    symbol,
    instrumentToken
  );

  const currentPrice = ltpResult.success && ltpResult.data ? 
    parseFloat(ltpResult.data.ltp) : averagePrice;

  // Add or update holding
  portfolio.updateHolding({
    symbol: symbol.toUpperCase(),
    exchange: exchange.toUpperCase(),
    instrumentToken,
    quantity: parseInt(quantity),
    averagePrice: parseFloat(averagePrice),
    currentPrice
  });

  await portfolio.save();

  res.json({
    success: true,
    message: 'Holding added successfully',
    data: {
      holding: {
        symbol: symbol.toUpperCase(),
        exchange: exchange.toUpperCase(),
        quantity: parseInt(quantity),
        averagePrice: parseFloat(averagePrice),
        currentPrice,
        investedValue: quantity * averagePrice,
        currentValue: quantity * currentPrice
      }
    }
  });
}));

// @desc    Remove holding
// @route   DELETE /api/portfolio/holding/:symbol/:exchange
// @access  Private
router.delete('/holding/:symbol/:exchange', requireSmartApiToken, asyncHandler(async (req, res) => {
  const { symbol, exchange } = req.params;

  const portfolio = await Portfolio.findOne({ userId: req.user._id });

  if (!portfolio) {
    throw new AppError('Portfolio not found', 404);
  }

  const holdingExists = portfolio.holdings.find(
    h => h.symbol === symbol.toUpperCase() && h.exchange === exchange.toUpperCase()
  );

  if (!holdingExists) {
    throw new AppError('Holding not found', 404);
  }

  portfolio.removeHolding(symbol.toUpperCase(), exchange.toUpperCase());
  await portfolio.save();

  res.json({
    success: true,
    message: 'Holding removed successfully'
  });
}));

module.exports = router;
