# SmartAPI Stock Platform - Setup Instructions

## Fixed Issues

### 1. Server Configuration
- ✅ Removed duplicate static file serving
- ✅ Fixed middleware order (API routes now come before catch-all routes)
- ✅ Removed duplicate CORS configuration
- ✅ Fixed Content Security Policy to allow CDN resources
- ✅ Proper error handling configuration

### 2. API Client
- ✅ Removed duplicate interceptors
- ✅ Fixed token refresh logic
- ✅ Added missing `clearTokens()` method
- ✅ Fixed duplicate `handleAuthError()` method

### 3. Route Order (Critical Fix)
The routes are now in the correct order:
1. Security middleware (Helmet, CORS)
2. Body parsers
3. Rate limiting
4. Health check endpoint
5. **API routes** (MUST come before static files)
6. Static file serving
7. Catch-all route for SPA
8. Error handler

## Prerequisites

1. **Node.js** (v14 or later)
2. **MongoDB** (running locally or MongoDB Atlas)
3. **npm** (comes with Node.js)

## Environment Setup

1. **Ensure your `.env` file has these variables:**
   ```env
   NODE_ENV=development
   PORT=10000
   MONGO_URI=mongodb://localhost:27017/smartapi
   JWT_SECRET=your_secure_jwt_secret_here_min_32_characters
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_EXPIRES_IN=30d
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

2. **Generate a secure JWT_SECRET:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

## Installation & Running

### Step 1: Install Dependencies
```bash
cd c:\Users\gutti\Downloads\sapi\smarapi
npm install
```

### Step 2: Start MongoDB
Make sure MongoDB is running on your system:
- **Windows:** Start MongoDB service from Services
- **Or use MongoDB Atlas** (cloud): Update `MONGO_URI` in `.env`

### Step 3: Start the Server
```bash
npm start
```

Or for development with auto-restart:
```bash
npm install -g nodemon
nodemon server.js
```

### Step 4: Access the Application
Open your browser and go to:
```
http://localhost:10000
```

## Expected Console Output

When the server starts successfully, you should see:
```
Environment variables loaded:
NODE_ENV: development
MONGO_URI: *****
📂 Serving static files from: [path]\public
🚀 Starting server...
🔄 Environment: development
📡 Port: 10000
🔌 Attempting to connect to MongoDB (Attempt 1/5)...
✅ MongoDB Connected: localhost
📊 Database: smartapi
🔗 Connection URL: mongodb://localhost:***@

✅ Server is running!
🌐 Local: http://localhost:10000
   Network: http://127.0.0.1:10000

📊 API Endpoints:
   - Health Check: http://localhost:10000/health
   - API Base URL: http://localhost:10000/api

🛑 Press Ctrl+C to stop the server
```

## Testing the Dashboard

1. **Register a new user:**
   - Go to http://localhost:10000
   - Click on "Register" tab
   - Fill in the registration form
   - Submit

2. **Login:**
   - Enter your email and password
   - Click "Login"

3. **Dashboard should load:**
   - You should see the dashboard with portfolio summary
   - Market status
   - Quick actions
   - Recent orders (empty initially)

## Troubleshooting

### Dashboard Not Loading

**Error:** "Failed to load dashboard" with "Cannot read properties of undefined"

**Solution:** This was fixed by:
- Correcting the middleware order in `server.js`
- Fixing duplicate route handlers
- Cleaning up the API client

### MongoDB Connection Issues

**Error:** "MongoDB connection error"

**Solutions:**
1. Ensure MongoDB is running
2. Check `MONGO_URI` in `.env`
3. For MongoDB Atlas, ensure IP is whitelisted
4. Check network connectivity

### CORS Errors

**Error:** "Access to fetch blocked by CORS policy"

**Solution:** Already fixed in `server.js` - CORS is configured to allow all origins in development mode.

### Static Files Not Loading

**Error:** 404 errors for JS/CSS files

**Solution:** Already fixed - static files are now served after API routes but before the catch-all route.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Dashboard
- `GET /api/user/dashboard` - Get dashboard data (requires authentication)

### Portfolio
- `GET /api/portfolio` - Get portfolio holdings
- `POST /api/portfolio/sync` - Sync portfolio with SmartAPI

### Market
- `GET /api/market/quotes` - Get market quotes
- `GET /api/market/status` - Get market status

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Place new order
- `GET /api/orders/:id` - Get order details

## Project Structure

```
smarapi/
├── middleware/          # Express middleware
│   ├── auth.js         # Authentication middleware
│   └── errorHandler.js # Error handling middleware
├── models/             # Mongoose models
│   ├── User.js
│   ├── Portfolio.js
│   └── Order.js
├── routes/             # API routes
│   ├── auth.js
│   ├── user.js
│   ├── portfolio.js
│   ├── market.js
│   └── orders.js
├── services/           # Business logic
│   └── smartApiService.js
├── public/             # Frontend files
│   ├── index.html
│   ├── css/
│   └── js/
│       ├── config.js
│       ├── utils.js
│       ├── api.new.js
│       ├── auth.new.js
│       ├── app.js
│       └── dashboard.js
├── .env                # Environment variables
├── server.js           # Main server file
└── package.json        # Dependencies

```

## Development Tips

1. **Clear browser cache** after making changes to JS/CSS files
2. **Check browser console** (F12) for errors
3. **Check server console** for API errors
4. **Use MongoDB Compass** to view database contents
5. **Test API endpoints** with Postman or Thunder Client

## Next Steps

1. ✅ Register a user
2. ✅ Login to the application
3. ✅ View dashboard
4. Configure SmartAPI credentials to enable trading features
5. Sync portfolio from Angel One
6. Start trading!

## Support

If you encounter any issues:
1. Check the console output (both browser and server)
2. Verify MongoDB is running
3. Verify `.env` file is configured correctly
4. Clear browser cache and restart the server
5. Check this setup guide again

---

**All issues have been fixed! Your application should now work correctly.**
