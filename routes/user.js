const express = require('express');
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Order = require('../models/Order');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// @desc    Get user dashboard data
// @route   GET /api/user/dashboard
// @access  Private
router.get('/dashboard', asyncHandler(async (req, res) => {
  console.log('📊 Dashboard request for user:', req.user._id);
  const userId = req.user._id;

  try {
    // Get portfolio summary
    console.log('📈 Fetching portfolio data...');
    const portfolio = await Portfolio.findOne({ userId });
    const portfolioSummary = portfolio ? {
      totalInvestedValue: portfolio.totalInvestedValue,
      totalCurrentValue: portfolio.totalCurrentValue,
      totalPnL: portfolio.totalPnL,
      totalPnLPercentage: portfolio.totalPnLPercentage,
      holdingsCount: portfolio.holdings.length,
      lastSyncAt: portfolio.lastSyncAt
    } : {
      totalInvestedValue: 0,
      totalCurrentValue: 0,
      totalPnL: 0,
      totalPnLPercentage: 0,
      holdingsCount: 0,
      lastSyncAt: null
    };

    console.log('✅ Portfolio data fetched:', portfolioSummary.holdingsCount, 'holdings');

    // Get recent orders (last 10)
    console.log('📋 Fetching recent orders...');
    const recentOrders = await Order.find({ userId })
      .sort({ orderTime: -1 })
      .limit(10)
      .select('symbol exchange orderType transactionType quantity price status orderTime');

    console.log('✅ Recent orders fetched:', recentOrders.length, 'orders');

    // Get order statistics for current month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyOrderStats = await Order.aggregate([
      {
        $match: {
          userId: userId,
          orderTime: { $gte: currentMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'COMPLETE'] }, 1, 0] }
          },
          totalValue: { $sum: '$executedValue' },
          buyOrders: {
            $sum: { $cond: [{ $eq: ['$transactionType', 'BUY'] }, 1, 0] }
          },
          sellOrders: {
            $sum: { $cond: [{ $eq: ['$transactionType', 'SELL'] }, 1, 0] }
          }
        }
      }
    ]);

    const orderStats = monthlyOrderStats[0] || {
      totalOrders: 0,
      completedOrders: 0,
      totalValue: 0,
      buyOrders: 0,
      sellOrders: 0
    };

    console.log('✅ Monthly stats fetched');

    // Get top performing holdings
    const topPerformers = portfolio && portfolio.holdings.length > 0 ?
      portfolio.getTopMovers(3) : { topGainers: [], topLosers: [] };

    console.log('✅ Top performers calculated');

    res.json({
      success: true,
      data: {
        dashboard: {
          user: {
            name: req.user.name,
            email: req.user.email,
            clientCode: req.user.clientCode,
            subscription: req.user.subscription,
            lastLogin: req.user.lastLogin,
            hasSmartApiToken: req.user.isSmartApiTokenValid()
          },
          portfolio: portfolioSummary,
          orders: {
            recent: recentOrders,
            monthlyStats: orderStats
          },
          topPerformers,
          alerts: {
            portfolioSync: !portfolio || !portfolio.lastSyncAt ||
              (new Date() - portfolio.lastSyncAt) > 24 * 60 * 60 * 1000,
            smartApiConnection: !req.user.isSmartApiTokenValid()
          }
        }
      }
    });

    console.log('✅ Dashboard response sent successfully');

  } catch (error) {
    console.error('❌ Dashboard error:', error);
    throw new AppError('Error fetching dashboard data', 500, error);
  }
}));

// @desc    Get user activity log
// @route   GET /api/user/activity
// @access  Private
router.get('/activity', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  const userId = req.user._id;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 50);
  const skip = (pageNum - 1) * limitNum;

  // Build activity log from various sources
  const activities = [];

  // Get recent orders
  const orderQuery = { userId };
  if (type === 'orders') {
    const orders = await Order.find(orderQuery)
      .sort({ orderTime: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('symbol exchange orderType transactionType quantity price status orderTime');

    orders.forEach(order => {
      activities.push({
        type: 'order',
        action: `${order.transactionType} order ${order.status.toLowerCase()}`,
        details: `${order.orderType} order for ${order.quantity} shares of ${order.symbol}`,
        symbol: order.symbol,
        exchange: order.exchange,
        timestamp: order.orderTime,
        status: order.status,
        metadata: {
          orderId: order._id,
          quantity: order.quantity,
          price: order.price
        }
      });
    });
  }

  // Get portfolio sync activities (simplified - would need audit log)
  if (!type || type === 'portfolio') {
    const portfolio = await Portfolio.findOne({ userId });
    if (portfolio && portfolio.lastSyncAt) {
      activities.push({
        type: 'portfolio',
        action: 'Portfolio synced',
        details: `Portfolio synchronized with ${portfolio.holdings.length} holdings`,
        timestamp: portfolio.lastSyncAt,
        status: portfolio.syncStatus,
        metadata: {
          holdingsCount: portfolio.holdings.length,
          totalValue: portfolio.totalCurrentValue
        }
      });
    }
  }

  // Get login activities (simplified)
  if (!type || type === 'auth') {
    activities.push({
      type: 'auth',
      action: 'User login',
      details: 'Successful login to platform',
      timestamp: req.user.lastLogin,
      status: 'SUCCESS',
      metadata: {
        loginCount: req.user.loginCount
      }
    });
  }

  // Sort activities by timestamp
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Apply pagination
  const paginatedActivities = activities.slice(skip, skip + limitNum);
  const total = activities.length;

  res.json({
    success: true,
    data: {
      activities: paginatedActivities,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1
      }
    }
  });
}));

// @desc    Get user preferences
// @route   GET /api/user/preferences
// @access  Private
router.get('/preferences', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      preferences: req.user.preferences
    }
  });
}));

// @desc    Update user preferences
// @route   PUT /api/user/preferences
// @access  Private
router.put('/preferences', asyncHandler(async (req, res) => {
  const { preferences } = req.body;

  if (!preferences || typeof preferences !== 'object') {
    throw new AppError('Invalid preferences data', 400);
  }

  // Validate preference values
  const validPreferences = {};

  if (preferences.defaultQuantity !== undefined) {
    const qty = parseInt(preferences.defaultQuantity);
    if (qty > 0 && qty <= 10000) {
      validPreferences.defaultQuantity = qty;
    }
  }

  if (preferences.riskLevel && ['low', 'medium', 'high'].includes(preferences.riskLevel)) {
    validPreferences.riskLevel = preferences.riskLevel;
  }

  if (preferences.theme && ['light', 'dark'].includes(preferences.theme)) {
    validPreferences.theme = preferences.theme;
  }

  if (preferences.notifications && typeof preferences.notifications === 'object') {
    validPreferences.notifications = {};

    if (typeof preferences.notifications.email === 'boolean') {
      validPreferences.notifications.email = preferences.notifications.email;
    }

    if (typeof preferences.notifications.push === 'boolean') {
      validPreferences.notifications.push = preferences.notifications.push;
    }

    if (typeof preferences.notifications.priceAlerts === 'boolean') {
      validPreferences.notifications.priceAlerts = preferences.notifications.priceAlerts;
    }
  }

  // Update user preferences
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        preferences: {
          ...req.user.preferences.toObject(),
          ...validPreferences
        }
      }
    },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: {
      preferences: updatedUser.preferences
    }
  });
}));

// @desc    Get user statistics
// @route   GET /api/user/stats
// @access  Private
router.get('/stats', asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { period = '30d' } = req.query;

  // Calculate date range based on period
  let dateFrom = new Date();
  switch (period) {
    case '7d':
      dateFrom.setDate(dateFrom.getDate() - 7);
      break;
    case '30d':
      dateFrom.setDate(dateFrom.getDate() - 30);
      break;
    case '90d':
      dateFrom.setDate(dateFrom.getDate() - 90);
      break;
    case '1y':
      dateFrom.setFullYear(dateFrom.getFullYear() - 1);
      break;
    default:
      dateFrom.setDate(dateFrom.getDate() - 30);
  }

  // Get portfolio stats
  const portfolio = await Portfolio.findOne({ userId });
  const portfolioStats = portfolio ? {
    totalHoldings: portfolio.holdings.length,
    totalInvestedValue: portfolio.totalInvestedValue,
    totalCurrentValue: portfolio.totalCurrentValue,
    totalPnL: portfolio.totalPnL,
    totalPnLPercentage: portfolio.totalPnLPercentage,
    topGainer: portfolio.getTopMovers(1).topGainers[0] || null,
    topLoser: portfolio.getTopMovers(1).topLosers[0] || null
  } : null;

  // Get order stats for the period
  const orderStats = await Order.aggregate([
    {
      $match: {
        userId: userId,
        orderTime: { $gte: dateFrom }
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        completedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'COMPLETE'] }, 1, 0] }
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] }
        },
        totalValue: { $sum: '$executedValue' },
        buyOrders: {
          $sum: { $cond: [{ $eq: ['$transactionType', 'BUY'] }, 1, 0] }
        },
        sellOrders: {
          $sum: { $cond: [{ $eq: ['$transactionType', 'SELL'] }, 1, 0] }
        },
        avgOrderValue: { $avg: '$executedValue' }
      }
    }
  ]);

  const orderStatsData = orderStats[0] || {
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalValue: 0,
    buyOrders: 0,
    sellOrders: 0,
    avgOrderValue: 0
  };

  // Calculate success rate
  const successRate = orderStatsData.totalOrders > 0 ?
    (orderStatsData.completedOrders / orderStatsData.totalOrders) * 100 : 0;

  // Get trading frequency (orders per day)
  const daysDiff = Math.ceil((new Date() - dateFrom) / (1000 * 60 * 60 * 24));
  const tradingFrequency = daysDiff > 0 ? orderStatsData.totalOrders / daysDiff : 0;

  res.json({
    success: true,
    data: {
      stats: {
        period,
        dateRange: {
          from: dateFrom,
          to: new Date()
        },
        portfolio: portfolioStats,
        trading: {
          ...orderStatsData,
          successRate: parseFloat(successRate.toFixed(2)),
          tradingFrequency: parseFloat(tradingFrequency.toFixed(2))
        },
        account: {
          memberSince: req.user.createdAt,
          totalLogins: req.user.loginCount,
          lastLogin: req.user.lastLogin,
          subscription: req.user.subscription
        }
      }
    }
  });
}));

// @desc    Delete user account
// @route   DELETE /api/user/account
// @access  Private
router.delete('/account', asyncHandler(async (req, res) => {
  const { confirmPassword } = req.body;

  if (!confirmPassword) {
    throw new AppError('Password confirmation required', 400);
  }

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Verify password
  if (!(await user.comparePassword(confirmPassword))) {
    throw new AppError('Incorrect password', 400);
  }

  // Delete related data
  await Portfolio.deleteOne({ userId: req.user._id });
  await Order.deleteMany({ userId: req.user._id });

  // Deactivate user account (soft delete)
  user.isActive = false;
  user.email = `deleted_${Date.now()}_${user.email}`;
  await user.save();

  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
}));

// @desc    Export user data
// @route   GET /api/user/export
// @access  Private
router.get('/export', asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get user data
  const user = await User.findById(userId).select('-password -smartApiTokens');
  const portfolio = await Portfolio.findOne({ userId });
  const orders = await Order.find({ userId }).sort({ orderTime: -1 });

  const exportData = {
    user: user.toObject(),
    portfolio: portfolio ? portfolio.toObject() : null,
    orders: orders.map(order => order.toObject()),
    exportedAt: new Date(),
    version: '1.0'
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="smartapi-data-${Date.now()}.json"`);

  res.json({
    success: true,
    data: exportData
  });
}));

module.exports = router;
