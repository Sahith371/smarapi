const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Debug: Log environment variables (remove in production)
console.log('Environment variables loaded:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGO_URI:', process.env.MONGO_URI ? '*****' : 'Not found');

// Import routes
const authRoutes = require('./routes/auth');
const marketRoutes = require('./routes/market');
const portfolioRoutes = require('./routes/portfolio');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/user');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 10000;

// Security middleware with updated CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"]
    }
  }
}));

// CORS configuration - Simplified for development
const corsOptions = {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Auth-Token',
    'X-CSRF-Token',
    'X-Access-Token',
    'X-Refresh-Token'
  ],
  exposedHeaders: [
    'Content-Length',
    'X-Access-Token',
    'X-Refresh-Token',
    'Set-Cookie'
  ],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400 // 24 hours
};

// Apply CORS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

app.use('/api/', limiter);

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes (MUST come before static files and catch-all)
app.use('/api/auth', authRoutes);
app.use('/api/market', authenticateToken, marketRoutes);
app.use('/api/portfolio', authenticateToken, portfolioRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/user', authenticateToken, userRoutes);

// Serve static files from the public directory
const publicPath = path.join(__dirname, 'public');
console.log(`📂 Serving static files from: ${publicPath}`);

app.use(express.static(publicPath, {
  etag: false,
  maxAge: 0,
  setHeaders: (res, path) => {
    // Disable caching in development
    if (process.env.NODE_ENV === 'development') {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  }
}));

// Handle client-side routing - return index.html for all other GET requests (MUST be last)
app.get('*', (req, res) => {
  // Don't serve HTML for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'API endpoint not found'
    });
  }
  
  // Serve index.html for all other routes to support client-side routing
  res.sendFile(path.join(publicPath, 'index.html'), (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(500).send('Error loading the application');
    }
  });
});

// Error handling middleware (MUST be last)
app.use(errorHandler);

// MongoDB connection with enhanced error handling and retry logic
const connectDB = async (retries = 5, interval = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      if (!process.env.MONGO_URI) {
        throw new Error('❌ MONGO_URI is not defined in environment variables');
      }

      console.log(`🔌 Attempting to connect to MongoDB (Attempt ${i + 1}/${retries})...`);
      
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,  // Increased from 5000 to 10000
        socketTimeoutMS: 45000,          // Increased from 30000 to 45000
        connectTimeoutMS: 30000,         // Increased from 10000 to 30000
        retryWrites: true,
        w: 'majority'
      });
      
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      console.log(`📊 Database: ${conn.connection.name}`);
      console.log(`🔗 Connection URL: ${process.env.MONGO_URI.replace(/:[^:]*@/, ':***@')}`);
      
      // Connection event listeners
      mongoose.connection.on('connected', () => {
        console.log('✅ Mongoose connected to DB');
      });
      
      mongoose.connection.on('error', (err) => {
        console.error('❌ Mongoose connection error:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('ℹ️  Mongoose disconnected');
      });
      
      return conn;
    } catch (error) {
      console.error(`❌ MongoDB connection error (Attempt ${i + 1}/${retries}):`, error.message);
      
      if (i === retries - 1) {
        console.error('❌ Maximum retry attempts reached. Exiting...');
        process.exit(1);
      }
      
      console.log(`⏳ Retrying in ${interval / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
};

// Start server with enhanced error handling and logging
const startServer = async () => {
  try {
    console.log('🚀 Starting server...');
    console.log(`🔄 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 Port: ${PORT}`);
    
    // Connect to MongoDB
    await connectDB();
    
    // Start the server
    const server = app.listen(PORT, '0.0.0.0', () => {
      const host = server.address().address;
      const port = server.address().port;
      console.log(`\n✅ Server is running!`);
      console.log(`🌐 Local: http://localhost:${port}`);
      console.log(`   Network: http://${host === '::' ? '127.0.0.1' : host}:${port}`);
      console.log(`\n📊 API Endpoints:`);
      console.log(`   - Health Check: http://localhost:${port}/health`);
      console.log(`   - API Base URL: http://localhost:${port}/api`);
      console.log(`\n🛑 Press Ctrl+C to stop the server\n`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('\n❌ UN HANDLED REJECTION! Shutting down...');
      console.error('Error:', err);
      server.close(() => {
        console.log('💥 Process terminated!');
        process.exit(1);
      });
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('\n❌ UNCAUGHT EXCEPTION! Shutting down...');
      console.error('Error:', err);
      server.close(() => {
        console.log('💥 Process terminated!');
        process.exit(1);
      });
    });
    
    // Handle SIGTERM (for Docker, Kubernetes, etc.)
    process.on('SIGTERM', () => {
      console.log('\n🛑 SIGTERM RECEIVED. Shutting down gracefully...');
      server.close(() => {
        console.log('👋 Process terminated!');
        process.exit(0);
      });
    });
    

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

module.exports = app;
