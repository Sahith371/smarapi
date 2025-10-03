const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Order identification
  orderId: {
    type: String,
    unique: true,
    sparse: true // Allows null values but ensures uniqueness when present
  },
  
  clientOrderId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Instrument details
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
  
  // Order details
  orderType: {
    type: String,
    required: true,
    enum: ['MARKET', 'LIMIT', 'SL', 'SL-M']
  },
  
  transactionType: {
    type: String,
    required: true,
    enum: ['BUY', 'SELL']
  },
  
  productType: {
    type: String,
    required: true,
    enum: ['DELIVERY', 'INTRADAY', 'MARGIN', 'BO', 'CO']
  },
  
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  
  price: {
    type: Number,
    required: function() {
      return this.orderType === 'LIMIT' || this.orderType === 'SL';
    },
    min: 0
  },
  
  triggerPrice: {
    type: Number,
    required: function() {
      return this.orderType === 'SL' || this.orderType === 'SL-M';
    },
    min: 0
  },
  
  // Order status and execution
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'OPEN', 'COMPLETE', 'CANCELLED', 'REJECTED', 'MODIFIED'],
    default: 'PENDING'
  },
  
  filledQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  
  pendingQuantity: {
    type: Number,
    default: function() {
      return this.quantity - this.filledQuantity;
    }
  },
  
  averagePrice: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Timestamps
  orderTime: {
    type: Date,
    default: Date.now
  },
  
  updateTime: {
    type: Date,
    default: Date.now
  },
  
  // Additional order parameters
  validity: {
    type: String,
    enum: ['DAY', 'IOC', 'GTD'],
    default: 'DAY'
  },
  
  variety: {
    type: String,
    enum: ['NORMAL', 'STOPLOSS', 'AMO', 'ROBO'],
    default: 'NORMAL'
  },
  
  // Stop loss and target (for bracket orders)
  squareoff: {
    type: Number,
    default: 0
  },
  
  stoploss: {
    type: Number,
    default: 0
  },
  
  trailingStoploss: {
    type: Number,
    default: 0
  },
  
  // Order metadata
  rejectionReason: {
    type: String,
    default: null
  },
  
  brokerOrderId: {
    type: String,
    default: null
  },
  
  exchangeOrderId: {
    type: String,
    default: null
  },
  
  // Calculated fields
  orderValue: {
    type: Number,
    default: function() {
      return this.quantity * (this.price || 0);
    }
  },
  
  executedValue: {
    type: Number,
    default: function() {
      return this.filledQuantity * this.averagePrice;
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderId: 1 });
orderSchema.index({ clientOrderId: 1 });
orderSchema.index({ symbol: 1, exchange: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderTime: -1 });

// Pre-save middleware to update calculated fields
orderSchema.pre('save', function(next) {
  this.pendingQuantity = this.quantity - this.filledQuantity;
  this.orderValue = this.quantity * (this.price || 0);
  this.executedValue = this.filledQuantity * this.averagePrice;
  this.updateTime = new Date();
  next();
});

// Instance methods
orderSchema.methods.isCompleted = function() {
  return this.status === 'COMPLETE';
};

orderSchema.methods.isPending = function() {
  return ['PENDING', 'OPEN'].includes(this.status);
};

orderSchema.methods.canBeModified = function() {
  return ['PENDING', 'OPEN'].includes(this.status);
};

orderSchema.methods.canBeCancelled = function() {
  return ['PENDING', 'OPEN'].includes(this.status);
};

// Update order status
orderSchema.methods.updateStatus = function(statusData) {
  Object.assign(this, statusData);
  this.updateTime = new Date();
  return this.save();
};

// Static methods
orderSchema.statics.getOrdersByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.symbol) {
    query.symbol = options.symbol.toUpperCase();
  }
  
  if (options.dateFrom || options.dateTo) {
    query.orderTime = {};
    if (options.dateFrom) {
      query.orderTime.$gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      query.orderTime.$lte = new Date(options.dateTo);
    }
  }
  
  return this.find(query)
    .sort({ orderTime: -1 })
    .limit(options.limit || 100);
};

orderSchema.statics.getOrderStats = function(userId, dateFrom, dateTo) {
  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId)
  };
  
  if (dateFrom || dateTo) {
    matchStage.orderTime = {};
    if (dateFrom) matchStage.orderTime.$gte = new Date(dateFrom);
    if (dateTo) matchStage.orderTime.$lte = new Date(dateTo);
  }
  
  return this.aggregate([
    { $match: matchStage },
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
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Order', orderSchema);
