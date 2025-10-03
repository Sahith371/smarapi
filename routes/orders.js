const express = require('express');
const Order = require('../models/Order');
const smartApiService = require('../services/smartApiService');
const { requireSmartApiToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const crypto = require('crypto');

const router = express.Router();

// @desc    Place new order
// @route   POST /api/orders
// @access  Private
router.post('/', requireSmartApiToken, asyncHandler(async (req, res) => {
  const {
    symbol,
    exchange,
    instrumentToken,
    orderType,
    transactionType,
    productType,
    quantity,
    price,
    triggerPrice,
    validity = 'DAY',
    variety = 'NORMAL'
  } = req.body;

  // Validation
  if (!symbol || !exchange || !instrumentToken || !orderType || !transactionType || !productType || !quantity) {
    throw new AppError('Please provide all required fields', 400);
  }

  if (quantity <= 0) {
    throw new AppError('Quantity must be positive', 400);
  }

  if ((orderType === 'LIMIT' || orderType === 'SL') && (!price || price <= 0)) {
    throw new AppError('Price is required for LIMIT and SL orders', 400);
  }

  if ((orderType === 'SL' || orderType === 'SL-M') && (!triggerPrice || triggerPrice <= 0)) {
    throw new AppError('Trigger price is required for SL and SL-M orders', 400);
  }

    // Generate unique client order ID
    const clientOrderId = `ORD_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  // Create order in database first
  const orderData = {
    userId: req.user._id,
    clientOrderId,
    symbol: symbol.toUpperCase(),
    exchange: exchange.toUpperCase(),
    instrumentToken,
    orderType,
    transactionType: transactionType.toUpperCase(),
    productType: productType.toUpperCase(),
    quantity: parseInt(quantity),
    price: price ? parseFloat(price) : undefined,
    triggerPrice: triggerPrice ? parseFloat(triggerPrice) : undefined,
    validity,
    variety,
    status: 'PENDING'
  };

  const order = await Order.create(orderData);

  try {
    // Prepare SmartAPI order data
    const smartApiOrderData = {
      variety: variety.toLowerCase(),
      tradingsymbol: symbol.toUpperCase(),
      symboltoken: instrumentToken,
      transactiontype: transactionType.toUpperCase(),
      exchange: exchange.toUpperCase(),
      ordertype: orderType,
      producttype: productType.toUpperCase(),
      duration: validity,
      quantity: quantity.toString()
    };

    // Add price fields based on order type
    if (orderType === 'LIMIT' || orderType === 'SL') {
      smartApiOrderData.price = price.toString();
    }

    if (orderType === 'SL' || orderType === 'SL-M') {
      smartApiOrderData.triggerprice = triggerPrice.toString();
    }

    // Place order with SmartAPI
    const result = await smartApiService.placeOrder(
      req.user.smartApiTokens.accessToken,
      smartApiOrderData
    );

    if (result.success && result.data) {
      // Update order with broker order ID
      order.orderId = result.data.orderid;
      order.brokerOrderId = result.data.orderid;
      order.status = 'OPEN';
      await order.save();

      res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        data: {
          order: {
            id: order._id,
            clientOrderId: order.clientOrderId,
            orderId: order.orderId,
            symbol: order.symbol,
            exchange: order.exchange,
            orderType: order.orderType,
            transactionType: order.transactionType,
            quantity: order.quantity,
            price: order.price,
            status: order.status,
            orderTime: order.orderTime
          },
          brokerResponse: result.data
        }
      });
    } else {
      // Update order status to rejected
      order.status = 'REJECTED';
      order.rejectionReason = result.message || 'Order placement failed';
      await order.save();

      throw new AppError(result.message || 'Failed to place order', 400);
    }

  } catch (error) {
    // Update order status to rejected
    order.status = 'REJECTED';
    order.rejectionReason = error.message;
    await order.save();
    
    throw error;
  }
}));

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
router.get('/', requireSmartApiToken, asyncHandler(async (req, res) => {
  const {
    status,
    symbol,
    dateFrom,
    dateTo,
    page = 1,
    limit = 50
  } = req.query;

  const options = {
    status,
    symbol,
    dateFrom,
    dateTo,
    limit: Math.min(parseInt(limit), 100) // Max 100 orders per request
  };

  const orders = await Order.getOrdersByUser(req.user._id, options);

  // Calculate pagination
  const total = await Order.countDocuments({
    userId: req.user._id,
    ...(status && { status }),
    ...(symbol && { symbol: symbol.toUpperCase() }),
    ...(dateFrom || dateTo) && {
      orderTime: {
        ...(dateFrom && { $gte: new Date(dateFrom) }),
        ...(dateTo && { $lte: new Date(dateTo) })
      }
    }
  });

  const totalPages = Math.ceil(total / options.limit);

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders: total,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    }
  });
}));

// @desc    Get order by ID
// @route   GET /api/orders/:orderId
// @access  Private
router.get('/:orderId', requireSmartApiToken, asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findOne({
    $or: [
      { _id: orderId },
      { orderId: orderId },
      { clientOrderId: orderId }
    ],
    userId: req.user._id
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  res.json({
    success: true,
    data: { order }
  });
}));

// @desc    Modify order
// @route   PUT /api/orders/:orderId
// @access  Private
router.put('/:orderId', requireSmartApiToken, asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { orderType, quantity, price, triggerPrice } = req.body;

  const order = await Order.findOne({
    $or: [
      { _id: orderId },
      { orderId: orderId },
      { clientOrderId: orderId }
    ],
    userId: req.user._id
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (!order.canBeModified()) {
    throw new AppError('Order cannot be modified in current status', 400);
  }

  // Validation
  if (quantity && quantity <= 0) {
    throw new AppError('Quantity must be positive', 400);
  }

  if ((orderType === 'LIMIT' || orderType === 'SL') && (!price || price <= 0)) {
    throw new AppError('Price is required for LIMIT and SL orders', 400);
  }

  if ((orderType === 'SL' || orderType === 'SL-M') && (!triggerPrice || triggerPrice <= 0)) {
    throw new AppError('Trigger price is required for SL and SL-M orders', 400);
  }

  try {
    // Prepare modification data for SmartAPI
    const modifyData = {
      variety: order.variety.toLowerCase(),
      orderid: order.orderId,
      ordertype: orderType || order.orderType,
      producttype: order.productType,
      duration: order.validity,
      quantity: (quantity || order.quantity).toString()
    };

    // Add price fields based on order type
    const newOrderType = orderType || order.orderType;
    if (newOrderType === 'LIMIT' || newOrderType === 'SL') {
      modifyData.price = (price || order.price).toString();
    }

    if (newOrderType === 'SL' || newOrderType === 'SL-M') {
      modifyData.triggerprice = (triggerPrice || order.triggerPrice).toString();
    }

    // Modify order with SmartAPI
    const result = await smartApiService.modifyOrder(
      req.user.smartApiTokens.accessToken,
      modifyData
    );

    if (result.success) {
      // Update order in database
      if (orderType) order.orderType = orderType;
      if (quantity) order.quantity = parseInt(quantity);
      if (price) order.price = parseFloat(price);
      if (triggerPrice) order.triggerPrice = parseFloat(triggerPrice);
      
      order.status = 'MODIFIED';
      await order.save();

      res.json({
        success: true,
        message: 'Order modified successfully',
        data: { order }
      });
    } else {
      throw new AppError(result.message || 'Failed to modify order', 400);
    }

  } catch (error) {
    throw error;
  }
}));

// @desc    Cancel order
// @route   DELETE /api/orders/:orderId
// @access  Private
router.delete('/:orderId', requireSmartApiToken, asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findOne({
    $or: [
      { _id: orderId },
      { orderId: orderId },
      { clientOrderId: orderId }
    ],
    userId: req.user._id
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (!order.canBeCancelled()) {
    throw new AppError('Order cannot be cancelled in current status', 400);
  }

  try {
    // Cancel order with SmartAPI
    const result = await smartApiService.cancelOrder(
      req.user.smartApiTokens.accessToken,
      order.variety.toLowerCase(),
      order.orderId
    );

    if (result.success) {
      // Update order status
      order.status = 'CANCELLED';
      await order.save();

      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: { order }
      });
    } else {
      throw new AppError(result.message || 'Failed to cancel order', 400);
    }

  } catch (error) {
    throw error;
  }
}));

// @desc    Sync orders with broker
// @route   POST /api/orders/sync
// @access  Private
router.post('/sync', requireSmartApiToken, asyncHandler(async (req, res) => {
  try {
    // Fetch order book from SmartAPI
    const result = await smartApiService.getOrderBook(
      req.user.smartApiTokens.accessToken
    );

    if (!result.success) {
      throw new AppError(result.message || 'Failed to sync orders', 400);
    }

    let syncedCount = 0;
    let newOrdersCount = 0;

    if (result.data && Array.isArray(result.data)) {
      for (const brokerOrder of result.data) {
        // Find existing order
        let order = await Order.findOne({
          $or: [
            { orderId: brokerOrder.orderid },
            { brokerOrderId: brokerOrder.orderid }
          ],
          userId: req.user._id
        });

        if (order) {
          // Update existing order
          const updated = await order.updateStatus({
            status: brokerOrder.status,
            filledQuantity: parseInt(brokerOrder.filledshares || 0),
            averagePrice: parseFloat(brokerOrder.averageprice || 0),
            exchangeOrderId: brokerOrder.exchorderid,
            updateTime: new Date()
          });

          if (updated) syncedCount++;
        } else {
          // Create new order (if it doesn't exist in our database)
          try {
            await Order.create({
              userId: req.user._id,
              orderId: brokerOrder.orderid,
              brokerOrderId: brokerOrder.orderid,
              clientOrderId: `SYNC_${brokerOrder.orderid}`,
              symbol: brokerOrder.tradingsymbol,
              exchange: brokerOrder.exchange,
              instrumentToken: brokerOrder.symboltoken,
              orderType: brokerOrder.ordertype,
              transactionType: brokerOrder.transactiontype,
              productType: brokerOrder.producttype,
              quantity: parseInt(brokerOrder.quantity),
              price: parseFloat(brokerOrder.price || 0),
              triggerPrice: parseFloat(brokerOrder.triggerprice || 0),
              status: brokerOrder.status,
              filledQuantity: parseInt(brokerOrder.filledshares || 0),
              averagePrice: parseFloat(brokerOrder.averageprice || 0),
              exchangeOrderId: brokerOrder.exchorderid,
              orderTime: new Date(brokerOrder.ordertime),
              variety: brokerOrder.variety || 'NORMAL',
              validity: brokerOrder.duration || 'DAY'
            });
            newOrdersCount++;
          } catch (createError) {
            console.error('Error creating synced order:', createError);
          }
        }
      }
    }

    res.json({
      success: true,
      message: 'Orders synced successfully',
      data: {
        syncedOrders: syncedCount,
        newOrders: newOrdersCount,
        totalBrokerOrders: result.data ? result.data.length : 0,
        lastSyncAt: new Date()
      }
    });

  } catch (error) {
    throw error;
  }
}));

// @desc    Get order statistics
// @route   GET /api/orders/stats
// @access  Private
router.get('/stats', requireSmartApiToken, asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;

  const stats = await Order.getOrderStats(req.user._id, dateFrom, dateTo);

  const orderStats = stats[0] || {
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalValue: 0,
    buyOrders: 0,
    sellOrders: 0
  };

  // Calculate additional metrics
  const successRate = orderStats.totalOrders > 0 ? 
    (orderStats.completedOrders / orderStats.totalOrders) * 100 : 0;

  const cancellationRate = orderStats.totalOrders > 0 ? 
    (orderStats.cancelledOrders / orderStats.totalOrders) * 100 : 0;

  res.json({
    success: true,
    data: {
      stats: {
        ...orderStats,
        successRate: parseFloat(successRate.toFixed(2)),
        cancellationRate: parseFloat(cancellationRate.toFixed(2)),
        averageOrderValue: orderStats.completedOrders > 0 ? 
          orderStats.totalValue / orderStats.completedOrders : 0
      },
      period: {
        from: dateFrom || 'All time',
        to: dateTo || 'Present'
      }
    }
  });
}));

module.exports = router;
