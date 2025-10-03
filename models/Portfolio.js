const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  
  exchange: {
    type: String,
    required: true,
    enum: ['NSE', 'BSE', 'NFO', 'BFO', 'CDS', 'MCX']
  },
  
  instrumentToken: {
    type: String,
    required: true
  },
  
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  
  averagePrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  currentPrice: {
    type: Number,
    default: 0
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // Calculated fields
  investedValue: {
    type: Number,
    default: function() {
      return this.quantity * this.averagePrice;
    }
  },
  
  currentValue: {
    type: Number,
    default: function() {
      return this.quantity * this.currentPrice;
    }
  },
  
  pnl: {
    type: Number,
    default: function() {
      return (this.quantity * this.currentPrice) - (this.quantity * this.averagePrice);
    }
  },
  
  pnlPercentage: {
    type: Number,
    default: function() {
      if (this.averagePrice === 0) return 0;
      return ((this.currentPrice - this.averagePrice) / this.averagePrice) * 100;
    }
  }
});

const portfolioSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  holdings: [holdingSchema],
  
  // Portfolio summary
  totalInvestedValue: {
    type: Number,
    default: 0
  },
  
  totalCurrentValue: {
    type: Number,
    default: 0
  },
  
  totalPnL: {
    type: Number,
    default: 0
  },
  
  totalPnLPercentage: {
    type: Number,
    default: 0
  },
  
  // Available funds
  availableFunds: {
    type: Number,
    default: 0
  },
  
  // Last sync with broker
  lastSyncAt: {
    type: Date,
    default: null
  },
  
  syncStatus: {
    type: String,
    enum: ['pending', 'syncing', 'completed', 'failed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Indexes for performance
portfolioSchema.index({ userId: 1 });
portfolioSchema.index({ 'holdings.symbol': 1 });
portfolioSchema.index({ lastSyncAt: -1 });

// Calculate portfolio totals
portfolioSchema.methods.calculateTotals = function() {
  let totalInvested = 0;
  let totalCurrent = 0;
  
  this.holdings.forEach(holding => {
    totalInvested += holding.quantity * holding.averagePrice;
    totalCurrent += holding.quantity * holding.currentPrice;
  });
  
  this.totalInvestedValue = totalInvested;
  this.totalCurrentValue = totalCurrent;
  this.totalPnL = totalCurrent - totalInvested;
  this.totalPnLPercentage = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;
  
  return this;
};

// Add or update holding
portfolioSchema.methods.updateHolding = function(holdingData) {
  const existingHoldingIndex = this.holdings.findIndex(
    h => h.symbol === holdingData.symbol && h.exchange === holdingData.exchange
  );
  
  if (existingHoldingIndex !== -1) {
    // Update existing holding
    this.holdings[existingHoldingIndex] = {
      ...this.holdings[existingHoldingIndex].toObject(),
      ...holdingData,
      lastUpdated: new Date()
    };
  } else {
    // Add new holding
    this.holdings.push({
      ...holdingData,
      lastUpdated: new Date()
    });
  }
  
  this.calculateTotals();
  return this;
};

// Remove holding
portfolioSchema.methods.removeHolding = function(symbol, exchange) {
  this.holdings = this.holdings.filter(
    h => !(h.symbol === symbol && h.exchange === exchange)
  );
  this.calculateTotals();
  return this;
};

// Update current prices for all holdings
portfolioSchema.methods.updateCurrentPrices = function(priceData) {
  this.holdings.forEach(holding => {
    const priceInfo = priceData.find(
      p => p.symbol === holding.symbol && p.exchange === holding.exchange
    );
    
    if (priceInfo) {
      holding.currentPrice = priceInfo.price;
      holding.lastUpdated = new Date();
    }
  });
  
  this.calculateTotals();
  return this;
};

// Get holdings by exchange
portfolioSchema.methods.getHoldingsByExchange = function(exchange) {
  return this.holdings.filter(h => h.exchange === exchange);
};

// Get top gainers/losers
portfolioSchema.methods.getTopMovers = function(limit = 5) {
  const sortedHoldings = [...this.holdings].sort((a, b) => b.pnlPercentage - a.pnlPercentage);
  
  return {
    topGainers: sortedHoldings.filter(h => h.pnlPercentage > 0).slice(0, limit),
    topLosers: sortedHoldings.filter(h => h.pnlPercentage < 0).slice(-limit).reverse()
  };
};

module.exports = mongoose.model('Portfolio', portfolioSchema);
