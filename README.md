# 📊 SmartAPI Stock Market Integration Platform

A comprehensive full-stack stock market platform built with Node.js, Express, MongoDB, and Angel One SmartAPI integration. This platform enables users to manage their stock portfolios, place trades, view real-time market data, and analyze their investments through a modern web interface.

## 🚀 Features

### ✅ Core Features
- **User Authentication** - Secure JWT-based authentication with Angel One SmartAPI OAuth
- **Real-time Market Data** - Live stock prices, order book data, and market depth
- **Portfolio Management** - View holdings, investments, P&L tracking, and performance analytics
- **Order Management** - Place, modify, and cancel market orders (BUY/SELL)
- **Historical Charts** - Interactive stock charts with multiple timeframes
- **Dashboard** - Comprehensive overview of portfolio and market status

### 🔐 Security Features
- JWT token authentication with refresh token support
- Encrypted API key storage
- Rate limiting and request validation
- CORS protection and security headers
- Input sanitization and XSS protection

### 📱 User Experience
- Responsive design for desktop, tablet, and mobile
- Modern UI with dark/light theme support
- Real-time notifications and alerts
- Intuitive navigation and user-friendly interface
- Loading states and error handling

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API protection

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS variables
- **Vanilla JavaScript** - No framework dependencies
- **Chart.js** - Interactive charts
- **Font Awesome** - Icons
- **Google Fonts** - Typography

### External APIs
- **Angel One SmartAPI** - Stock market data and trading
- **MongoDB Atlas** - Cloud database

### Deployment
- **Render** - Backend hosting
- **GitHub** - Version control and CI/CD

## 📋 Prerequisites

Before running this application, make sure you have:

1. **Node.js** (v16 or higher)
2. **MongoDB** database (local or MongoDB Atlas)
3. **Angel One SmartAPI** account and credentials
4. **Git** for version control

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/smartapi-stock-platform.git
cd smartapi-stock-platform
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=10000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/smartapi-platform

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRE=7d

# Angel One SmartAPI Configuration
SMART_API_KEY=your_smart_api_key
SMART_API_SECRET=your_smart_api_secret
SMART_API_CLIENT_CODE=your_client_code
SMART_API_REDIRECT_URL=http://localhost:10000/callback
SMART_API_BASE_URL=https://apiconnect.angelbroking.com

# CORS Configuration
FRONTEND_URL=http://localhost:10000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Angel One SmartAPI Setup
1. Register at [Angel One SmartAPI](https://smartapi.angelbroking.com/)
2. Create an app and get your API credentials
3. Add the credentials to your `.env` file
4. Enable required permissions for your app

### 5. MongoDB Setup
#### Option A: MongoDB Atlas (Recommended)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string and add to `.env`

#### Option B: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use local connection string: `mongodb://localhost:27017/smartapi-platform`

### 6. Start the Application
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The application will be available at `http://localhost:10000`

## 📁 Project Structure

```
smartapi-stock-platform/
├── models/                 # Database models
│   ├── User.js            # User model with auth
│   ├── Portfolio.js       # Portfolio and holdings
│   └── Order.js           # Order management
├── routes/                # API routes
│   ├── auth.js           # Authentication routes
│   ├── market.js         # Market data routes
│   ├── portfolio.js      # Portfolio routes
│   ├── orders.js         # Order routes
│   └── user.js           # User management routes
├── middleware/            # Custom middleware
│   ├── auth.js           # JWT authentication
│   └── errorHandler.js   # Error handling
├── services/              # External services
│   └── smartApiService.js # Angel One API integration
├── public/                # Frontend files
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript modules
│   └── index.html        # Main HTML file
├── server.js             # Main server file
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/smartapi-login` - Connect to Angel One
- `POST /api/auth/refresh-token` - Refresh JWT token

### Portfolio
- `GET /api/portfolio` - Get user portfolio
- `POST /api/portfolio/sync` - Sync with broker
- `POST /api/portfolio/update-prices` - Update current prices
- `GET /api/portfolio/analytics` - Portfolio analytics

### Market Data
- `GET /api/market/search` - Search instruments
- `POST /api/market/ltp` - Get last traded prices
- `GET /api/market/historical/:exchange/:token` - Historical data
- `GET /api/market/status` - Market status
- `GET /api/market/popular` - Popular stocks

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Place new order
- `PUT /api/orders/:id` - Modify order
- `DELETE /api/orders/:id` - Cancel order
- `POST /api/orders/sync` - Sync with broker

### User Management
- `GET /api/user/dashboard` - Dashboard data
- `PUT /api/user/preferences` - Update preferences
- `GET /api/user/activity` - User activity log
- `GET /api/user/stats` - User statistics

## 🚀 Deployment

### Deploy to Render

1. **Prepare for Deployment**
   ```bash
   # Ensure all dependencies are in package.json
   npm install --production
   ```

2. **Create Render Account**
   - Sign up at [Render](https://render.com)
   - Connect your GitHub repository

3. **Configure Environment Variables**
   Add all environment variables from your `.env` file to Render dashboard

4. **Deploy**
   - Render will automatically deploy from your GitHub repository
   - Set build command: `npm install`
   - Set start command: `npm start`

### Environment Variables for Production
```env
NODE_ENV=production
PORT=10000
MONGO_URI=your_production_mongodb_uri
JWT_SECRET=your_production_jwt_secret
SMART_API_KEY=your_smart_api_key
SMART_API_SECRET=your_smart_api_secret
SMART_API_CLIENT_CODE=your_client_code
SMART_API_REDIRECT_URL=https://your-app.onrender.com/callback
FRONTEND_URL=https://your-app.onrender.com
```

## 📖 Usage Guide

### 1. User Registration
1. Open the application
2. Click "Register" tab
3. Fill in your details including Angel One client code
4. Submit registration form

### 2. SmartAPI Connection
1. After login, you'll be prompted to connect to Angel One
2. Enter your trading password and TOTP
3. This enables live trading features

### 3. Portfolio Management
1. Navigate to Portfolio section
2. Click "Sync" to import your holdings from Angel One
3. View your P&L, holdings, and analytics

### 4. Place Orders
1. Go to Orders section
2. Click "Place Order"
3. Select instrument, quantity, and order type
4. Submit order

### 5. Market Analysis
1. Visit Market section
2. Search for stocks
3. View charts and market data
4. Add stocks to watchlist

## 🔧 Configuration Options

### Theme Configuration
```javascript
// In public/js/config.js
THEME: {
    DEFAULT: 'light', // or 'dark'
    STORAGE_KEY: 'smartapi_theme'
}
```

### API Rate Limiting
```javascript
// In server.js
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
```

### Chart Configuration
```javascript
// In public/js/config.js
CHART: {
    DEFAULT_INTERVAL: 'ONE_DAY',
    DEFAULT_PERIOD: '30d',
    COLORS: {
        POSITIVE: '#10b981',
        NEGATIVE: '#ef4444'
    }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **SmartAPI Connection Failed**
   - Verify API credentials in `.env`
   - Check if TOTP is correct (6-digit code)
   - Ensure Angel One account is active

2. **Database Connection Error**
   - Check MongoDB URI in `.env`
   - Verify database is running
   - Check network connectivity

3. **JWT Token Expired**
   - Tokens automatically refresh
   - Clear browser storage if issues persist
   - Check JWT_SECRET configuration

4. **CORS Errors**
   - Verify FRONTEND_URL in `.env`
   - Check CORS configuration in server.js

### Debug Mode
Enable debug logging:
```env
NODE_ENV=development
DEBUG=true
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

### Development Guidelines
- Follow existing code style
- Add comments for complex logic
- Test all API endpoints
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Angel One SmartAPI](https://smartapi.angelbroking.com/) for market data
- [Chart.js](https://www.chartjs.org/) for charting capabilities
- [Font Awesome](https://fontawesome.com/) for icons
- [MongoDB](https://www.mongodb.com/) for database services

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Email: support@yourapp.com
- Documentation: [Wiki](https://github.com/yourusername/smartapi-stock-platform/wiki)

## 🔮 Future Enhancements

- [ ] Technical indicators (EMA, RSI, MACD)
- [ ] AI-powered stock recommendations
- [ ] Real-time price alerts
- [ ] Mobile app (React Native)
- [ ] Social trading features
- [ ] Advanced portfolio analytics
- [ ] Options trading support
- [ ] Automated trading strategies

---

**⚠️ Disclaimer**: This platform is for educational and informational purposes. Always consult with financial advisors before making investment decisions. Trading in stocks involves risk of loss.

**🔒 Security Note**: Never share your API keys or trading credentials. Always use environment variables for sensitive configuration.
