const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    // Add user to request object
    req.user = user;
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Check if user has valid SmartAPI token
const requireSmartApiToken = async (req, res, next) => {
  try {
    if (!req.user.isSmartApiTokenValid()) {
      return res.status(401).json({
        success: false,
        message: 'SmartAPI authentication required. Please login to Angel One.',
        requiresSmartApiAuth: true
      });
    }
    
    next();
  } catch (error) {
    console.error('SmartAPI token check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Token validation error'
    });
  }
};

// Check subscription level
const requireSubscription = (requiredPlan = 'premium') => {
  return (req, res, next) => {
    try {
      const userPlan = req.user.subscription.plan;
      const planHierarchy = { 'free': 0, 'premium': 1, 'pro': 2 };
      
      if (planHierarchy[userPlan] < planHierarchy[requiredPlan]) {
        return res.status(403).json({
          success: false,
          message: `${requiredPlan} subscription required`,
          currentPlan: userPlan,
          requiredPlan: requiredPlan
        });
      }
      
      // Check if subscription is expired
      if (req.user.subscription.expiryDate && req.user.subscription.expiryDate < new Date()) {
        return res.status(403).json({
          success: false,
          message: 'Subscription expired',
          subscriptionExpired: true
        });
      }
      
      next();
    } catch (error) {
      console.error('Subscription check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Subscription validation error'
      });
    }
  };
};

// Admin only access
const requireAdmin = (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  authenticateToken,
  requireSmartApiToken,
  requireSubscription,
  requireAdmin,
  optionalAuth,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken
};
