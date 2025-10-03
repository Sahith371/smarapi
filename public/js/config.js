// Application Configuration
const CONFIG = {
    // API Configuration
    API: {
        BASE_URL: window.location.origin,
        ENDPOINTS: {
            // Auth endpoints
            LOGIN: '/api/auth/login',
            REGISTER: '/api/auth/register',
            LOGOUT: '/api/auth/logout',
            ME: '/api/auth/me',
            SMARTAPI_LOGIN: '/api/auth/smartapi-login',
            SMARTAPI_STATUS: '/api/auth/smartapi-status',
            REFRESH_TOKEN: '/api/auth/refresh-token',
            REFRESH_SMARTAPI: '/api/auth/refresh-smartapi',
            
            // User endpoints
            DASHBOARD: '/api/user/dashboard',
            PROFILE: '/api/auth/profile',
            PREFERENCES: '/api/user/preferences',
            ACTIVITY: '/api/user/activity',
            STATS: '/api/user/stats',
            
            // Portfolio endpoints
            PORTFOLIO: '/api/portfolio',
            PORTFOLIO_SYNC: '/api/portfolio/sync',
            PORTFOLIO_UPDATE_PRICES: '/api/portfolio/update-prices',
            PORTFOLIO_ANALYTICS: '/api/portfolio/analytics',
            PORTFOLIO_HOLDING: '/api/portfolio/holding',
            
            // Market endpoints
            MARKET_SEARCH: '/api/market/search',
            MARKET_LTP: '/api/market/ltp',
            MARKET_HISTORICAL: '/api/market/historical',
            MARKET_STATUS: '/api/market/status',
            MARKET_POPULAR: '/api/market/popular',
            MARKET_MOVERS: '/api/market/movers',
            
            // Order endpoints
            ORDERS: '/api/orders',
            ORDERS_SYNC: '/api/orders/sync',
            ORDERS_STATS: '/api/orders/stats'
        }
    },
    
    // Application Settings
    APP: {
        NAME: 'SmartAPI Platform',
        VERSION: '1.0.0',
        THEME: {
            DEFAULT: 'light',
            STORAGE_KEY: 'smartapi_theme'
        },
        LANGUAGE: {
            DEFAULT: 'en',
            STORAGE_KEY: 'smartapi_language'
        }
    },
    
    // Local Storage Keys
    STORAGE: {
        TOKEN: 'smartapi_token',
        REFRESH_TOKEN: 'smartapi_refresh_token',
        USER: 'smartapi_user',
        PREFERENCES: 'smartapi_preferences',
        WATCHLIST: 'smartapi_watchlist',
        RECENT_SEARCHES: 'smartapi_recent_searches'
    },
    
    // UI Configuration
    UI: {
        TOAST: {
            DURATION: 5000,
            MAX_TOASTS: 5
        },
        PAGINATION: {
            DEFAULT_LIMIT: 20,
            MAX_LIMIT: 100
        },
        REFRESH_INTERVALS: {
            DASHBOARD: 30000,      // 30 seconds
            PORTFOLIO: 60000,      // 1 minute
            MARKET_DATA: 5000,     // 5 seconds
            ORDERS: 10000          // 10 seconds
        },
        CHART: {
            DEFAULT_INTERVAL: 'ONE_DAY',
            DEFAULT_PERIOD: '30d',
            COLORS: {
                POSITIVE: '#10b981',
                NEGATIVE: '#ef4444',
                NEUTRAL: '#6b7280',
                PRIMARY: '#2563eb'
            }
        }
    },
    
    // Market Configuration
    MARKET: {
        EXCHANGES: ['NSE', 'BSE', 'NFO', 'BFO', 'CDS', 'MCX'],
        ORDER_TYPES: ['MARKET', 'LIMIT', 'SL', 'SL-M'],
        PRODUCT_TYPES: ['DELIVERY', 'INTRADAY', 'MARGIN', 'BO', 'CO'],
        TRANSACTION_TYPES: ['BUY', 'SELL'],
        INTERVALS: [
            { value: 'ONE_MINUTE', label: '1m' },
            { value: 'THREE_MINUTE', label: '3m' },
            { value: 'FIVE_MINUTE', label: '5m' },
            { value: 'TEN_MINUTE', label: '10m' },
            { value: 'FIFTEEN_MINUTE', label: '15m' },
            { value: 'THIRTY_MINUTE', label: '30m' },
            { value: 'ONE_HOUR', label: '1h' },
            { value: 'ONE_DAY', label: '1D' }
        ],
        PERIODS: [
            { value: '1d', label: '1 Day' },
            { value: '7d', label: '1 Week' },
            { value: '30d', label: '1 Month' },
            { value: '90d', label: '3 Months' },
            { value: '1y', label: '1 Year' }
        ]
    },
    
    // Validation Rules
    VALIDATION: {
        PASSWORD: {
            MIN_LENGTH: 6,
            PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/
        },
        EMAIL: {
            PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        PHONE: {
            PATTERN: /^[6-9]\d{9}$/
        },
        CLIENT_CODE: {
            PATTERN: /^[A-Z0-9]{6,10}$/
        },
        QUANTITY: {
            MIN: 1,
            MAX: 100000
        },
        PRICE: {
            MIN: 0.01,
            MAX: 1000000
        }
    },
    
    // Error Messages
    ERRORS: {
        NETWORK: 'Network error. Please check your connection.',
        UNAUTHORIZED: 'Session expired. Please login again.',
        FORBIDDEN: 'Access denied.',
        NOT_FOUND: 'Resource not found.',
        SERVER_ERROR: 'Server error. Please try again later.',
        VALIDATION: 'Please check your input and try again.',
        SMARTAPI_CONNECTION: 'SmartAPI connection required. Please connect to Angel One.',
        INSUFFICIENT_FUNDS: 'Insufficient funds for this transaction.',
        MARKET_CLOSED: 'Market is currently closed.',
        INVALID_SYMBOL: 'Invalid or unsupported symbol.',
        ORDER_FAILED: 'Order placement failed. Please try again.'
    },
    
    // Success Messages
    SUCCESS: {
        LOGIN: 'Login successful!',
        REGISTER: 'Registration successful!',
        LOGOUT: 'Logged out successfully!',
        PROFILE_UPDATED: 'Profile updated successfully!',
        ORDER_PLACED: 'Order placed successfully!',
        ORDER_CANCELLED: 'Order cancelled successfully!',
        ORDER_MODIFIED: 'Order modified successfully!',
        PORTFOLIO_SYNCED: 'Portfolio synced successfully!',
        SMARTAPI_CONNECTED: 'Connected to Angel One successfully!',
        PREFERENCES_SAVED: 'Preferences saved successfully!'
    },
    
    // Feature Flags
    FEATURES: {
        DARK_MODE: true,
        NOTIFICATIONS: true,
        ADVANCED_CHARTS: true,
        PAPER_TRADING: false,
        SOCIAL_FEATURES: false,
        AI_INSIGHTS: true,
        MOBILE_APP: false
    },
    
    // Debug Configuration
    DEBUG: {
        ENABLED: window.location.hostname === 'localhost',
        LOG_LEVEL: 'info', // error, warn, info, debug
        API_LOGGING: true,
        PERFORMANCE_MONITORING: true
    }
};

// Freeze configuration to prevent modifications
Object.freeze(CONFIG);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
