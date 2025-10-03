const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const smartApiService = require('../services/smartApiService');
const { generateToken, generateRefreshToken, verifyRefreshToken, authenticateToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const jwt = require('jsonwebtoken');

const router = express.Router();

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, phone, clientCode, password } = req.body;

  // Validation
  if (!name || !email || !phone || !clientCode || !password) {
    throw new AppError('Please provide all required fields', 400);
  }

  if (password.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { clientCode }]
  });

  if (existingUser) {
    throw new AppError('User with this email or client code already exists', 400);
  }

  // Create user
  const user = await User.create({
    name,
    email,
    phone,
    clientCode,
    password
  });

  // Create empty portfolio for user
  await Portfolio.create({
    userId: user._id,
    holdings: [],
    totalInvestedValue: 0,
    totalCurrentValue: 0,
    totalPnL: 0,
    totalPnLPercentage: 0
  });

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        clientCode: user.clientCode,
        isVerified: user.isVerified,
        subscription: user.subscription
      },
      token,
      refreshToken
    }
  });
}));

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    throw new AppError('Please provide email and password', 400);
  }

  // Check if user exists and get password
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated. Please contact support.', 401);
  }

  // Update last login
  await user.updateLastLogin();

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        clientCode: user.clientCode,
        isVerified: user.isVerified,
        subscription: user.subscription,
        lastLogin: user.lastLogin,
        hasSmartApiToken: user.isSmartApiTokenValid()
      },
      token,
      refreshToken
    }
  });
}));

// @desc    SmartAPI login
// @route   POST /api/auth/smartapi-login
// @access  Private
router.post('/smartapi-login', authenticateToken, asyncHandler(async (req, res) => {
  const { password, totp } = req.body;

  if (!password || !totp) {
    throw new AppError('Please provide password and TOTP', 400);
  }

  // Login to SmartAPI
  const loginResult = await smartApiService.generateSession(
    req.user.clientCode,
    password,
    totp
  );

  if (!loginResult.success) {
    throw new AppError(loginResult.message || 'SmartAPI login failed', 400);
  }

  // Update user with SmartAPI tokens
  req.user.smartApiTokens = {
    accessToken: loginResult.data.jwtToken,
    refreshToken: loginResult.data.refreshToken,
    tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  };

  await req.user.save();

  // Get user profile from SmartAPI
  const profileResult = await smartApiService.getUserProfile(loginResult.data.jwtToken);

  res.json({
    success: true,
    message: 'SmartAPI login successful',
    data: {
      smartApiConnected: true,
      profile: profileResult.data,
      feedToken: loginResult.data.feedToken
    }
  });
}));

// @desc    Refresh SmartAPI token
// @route   POST /api/auth/refresh-smartapi
// @access  Private
router.post('/refresh-smartapi', authenticateToken, asyncHandler(async (req, res) => {
  if (!req.user.smartApiTokens.refreshToken) {
    throw new AppError('No refresh token available. Please login again.', 401);
  }

  const refreshResult = await smartApiService.refreshToken(
    req.user.smartApiTokens.refreshToken
  );

  if (!refreshResult.success) {
    // Clear invalid tokens
    req.user.smartApiTokens = {
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null
    };
    await req.user.save();

    throw new AppError('Token refresh failed. Please login again.', 401);
  }

  // Update tokens
  req.user.smartApiTokens = {
    accessToken: refreshResult.data.jwtToken,
    refreshToken: refreshResult.data.refreshToken,
    tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };

  await req.user.save();

  res.json({
    success: true,
    message: 'SmartAPI token refreshed successfully',
    data: {
      tokenRefreshed: true,
      feedToken: refreshResult.data.feedToken
    }
  });
}));

// @desc    Refresh JWT token
// @route   POST /api/auth/refresh-token
// @access  Public
router.post('/refresh-token', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token required', 400);
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }
}));

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  // Logout from SmartAPI if connected
  if (req.user.isSmartApiTokenValid()) {
    await smartApiService.logout(req.user.smartApiTokens.accessToken);
  }

  // Clear SmartAPI tokens
  req.user.smartApiTokens = {
    accessToken: null,
    refreshToken: null,
    tokenExpiry: null
  };

  await req.user.save();

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        clientCode: req.user.clientCode,
        isVerified: req.user.isVerified,
        subscription: req.user.subscription,
        preferences: req.user.preferences,
        lastLogin: req.user.lastLogin,
        loginCount: req.user.loginCount,
        hasSmartApiToken: req.user.isSmartApiTokenValid(),
        createdAt: req.user.createdAt
      }
    }
  });
}));

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const { name, phone, preferences } = req.body;

  const updateData = {};
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;
  if (preferences) updateData.preferences = { ...req.user.preferences, ...preferences };

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user }
  });
}));

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', authenticateToken, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Please provide current and new password', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters', 400);
  }

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 400);
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// @desc    Check SmartAPI connection status
// @route   GET /api/auth/smartapi-status
// @access  Private
router.get('/smartapi-status', authenticateToken, asyncHandler(async (req, res) => {
  const isConnected = req.user.isSmartApiTokenValid();
  let profile = null;

  if (isConnected) {
    const profileResult = await smartApiService.getUserProfile(
      req.user.smartApiTokens.accessToken
    );
    if (profileResult.success) {
      profile = profileResult.data;
    }
  }

  res.json({
    success: true,
    data: {
      isConnected,
      tokenExpiry: req.user.smartApiTokens.tokenExpiry,
      profile
    }
  });
}));

// @desc    OAuth Callback for Angel One
// @route   GET /api/auth/callback
// @access  Public
router.get('/callback', asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  
  if (!code) {
    throw new AppError('Authorization code is required', 400);
  }

  // Exchange authorization code for tokens
  const result = await smartApiService.handleOAuthCallback(code);
  
  if (!result.success) {
    throw new AppError(result.message || 'Failed to authenticate with Angel One', 400);
  }

  const { jwtToken, refreshToken, feedToken, clientCode } = result.data;
  
  // Find user by client code
  const user = await User.findOne({ clientCode });
  
  if (!user) {
    // If user doesn't exist, redirect to registration with error
    return res.redirect(`/register?error=user_not_found&clientCode=${encodeURIComponent(clientCode)}`);
  }

  // Update user with new tokens
  user.smartApiTokens = {
    jwtToken,
    refreshToken,
    feedToken,
    lastRefreshed: new Date()
  };
  
  await user.save();

  // Generate JWT for our application
  const token = generateToken(user._id);
  const refreshTokenForApp = generateRefreshToken(user._id);

  // Set cookies or send tokens in response
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  // Redirect to frontend with success state
  const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${redirectUrl}/dashboard?auth=success`);
}));

// @desc    Get OAuth login URL
// @route   GET /api/auth/smartapi/login
// @access  Private
router.get('/smartapi/login', authenticateToken, (req, res) => {
  const authUrl = new URL('https://smartapi.angelbroking.com/publisher-login');
  authUrl.searchParams.append('api_key', process.env.SMART_API_KEY);
  authUrl.searchParams.append('redirect_uri', process.env.SMART_API_REDIRECT_URL);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('state', req.user.id); // Using user ID as state for CSRF protection
  
  res.json({
    success: true,
    url: authUrl.toString()
  });
});

module.exports = router;
