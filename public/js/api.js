// API Service Layer

class ApiService {
    constructor() {
        this.baseURL = CONFIG.API.BASE_URL;
        this.token = Utils.storage.get(CONFIG.STORAGE.TOKEN);
        this.refreshToken = Utils.storage.get(CONFIG.STORAGE.REFRESH_TOKEN);
        
        // Request interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        // Setup default interceptors
        this.setupInterceptors();
    }
    
    /**
     * Setup request/response interceptors
     */
    setupInterceptors() {
        // Add auth token to requests
        this.addRequestInterceptor((config) => {
            if (this.token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${this.token}`;
            }
            return config;
        });
        
        // Handle token refresh on 401
        this.addResponseInterceptor(
            (response) => response,
            async (error) => {
                if (error.status === 401 && this.refreshToken) {
                    try {
                        await this.refreshAccessToken();
                        // Retry original request
                        return this.request(error.config);
                    } catch (refreshError) {
                        this.handleAuthError();
                        throw refreshError;
                    }
                }
                throw error;
            }
        );
    }
    
    /**
     * Add request interceptor
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }
    
    /**
     * Add response interceptor
     */
    addResponseInterceptor(onSuccess, onError) {
        this.responseInterceptors.push({ onSuccess, onError });
    }
    
    /**
     * Apply request interceptors
     */
    applyRequestInterceptors(config) {
        return this.requestInterceptors.reduce((config, interceptor) => {
            return interceptor(config);
        }, config);
    }
    
    /**
     * Apply response interceptors
     */
    async applyResponseInterceptors(response, isError = false) {
        for (const interceptor of this.responseInterceptors) {
            try {
                if (isError && interceptor.onError) {
                    response = await interceptor.onError(response);
                } else if (!isError && interceptor.onSuccess) {
                    response = await interceptor.onSuccess(response);
                }
            } catch (error) {
                if (isError) throw error;
                throw error;
            }
        }
        return response;
    }
    
    /**
     * Make HTTP request
     */
    async request(config) {
        try {
            // Apply request interceptors
            config = this.applyRequestInterceptors(config);
            
            // Set default headers
            const headers = {
                'Content-Type': 'application/json',
                ...config.headers
            };
            
            // Build fetch options
            const options = {
                method: config.method || 'GET',
                headers,
                ...config
            };
            
            // Add body for non-GET requests
            if (config.data && options.method !== 'GET') {
                options.body = JSON.stringify(config.data);
            }
            
            // Make request
            const response = await fetch(config.url, options);
            
            // Parse response
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
            
            const result = {
                data,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                config
            };
            
            if (!response.ok) {
                const error = new Error(data.message || response.statusText);
                error.response = result;
                error.status = response.status;
                error.config = config;
                
                // Apply error interceptors
                throw await this.applyResponseInterceptors(error, true);
            }
            
            // Apply success interceptors
            return await this.applyResponseInterceptors(result);
            
        } catch (error) {
            if (CONFIG.DEBUG.API_LOGGING) {
                console.error('API Request Error:', error);
            }
            throw error;
        }
    }
    
    /**
     * GET request
     */
    async get(url, params = {}, config = {}) {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;
        
        return this.request({
            method: 'GET',
            url: this.baseURL + fullUrl,
            ...config
        });
    }
    
    /**
     * POST request
     */
    async post(url, data = {}, config = {}) {
        return this.request({
            method: 'POST',
            url: this.baseURL + url,
            data,
            ...config
        });
    }
    
    /**
     * PUT request
     */
    async put(url, data = {}, config = {}) {
        return this.request({
            method: 'PUT',
            url: this.baseURL + url,
            data,
            ...config
        });
    }
    
    /**
     * DELETE request
     */
    async delete(url, config = {}) {
        return this.request({
            method: 'DELETE',
            url: this.baseURL + url,
            ...config
        });
    }
    
    /**
     * Set authentication token
     */
    setToken(token) {
        this.token = token;
        Utils.storage.set(CONFIG.STORAGE.TOKEN, token);
    }
    
    /**
     * Set refresh token
     */
    setRefreshToken(refreshToken) {
        this.refreshToken = refreshToken;
        Utils.storage.set(CONFIG.STORAGE.REFRESH_TOKEN, refreshToken);
    }
    
    /**
     * Clear tokens
     */
    clearTokens() {
        this.token = null;
        this.refreshToken = null;
        Utils.storage.remove(CONFIG.STORAGE.TOKEN);
        Utils.storage.remove(CONFIG.STORAGE.REFRESH_TOKEN);
    }
    
    /**
     * Refresh access token
     */
    async refreshAccessToken() {
        try {
            const response = await fetch(this.baseURL + CONFIG.API.ENDPOINTS.REFRESH_TOKEN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refreshToken: this.refreshToken
                })
            });
            
            if (!response.ok) {
                throw new Error('Token refresh failed');
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.setToken(data.data.token);
                this.setRefreshToken(data.data.refreshToken);
                return data.data;
            } else {
                throw new Error(data.message || 'Token refresh failed');
            }
        } catch (error) {
            this.handleAuthError();
            throw error;
        }
    }
    
    /**
     * Handle authentication errors
     */
    handleAuthError() {
        this.clearTokens();
        Utils.storage.remove(CONFIG.STORAGE.USER);
        
        // Redirect to login if not already there
        if (!window.location.pathname.includes('login')) {
            window.location.reload();
        }
    }
    
    // Auth API methods
    async login(credentials) {
        const response = await this.post(CONFIG.API.ENDPOINTS.LOGIN, credentials);
        
        if (response.data.success) {
            this.setToken(response.data.data.token);
            this.setRefreshToken(response.data.data.refreshToken);
            Utils.storage.set(CONFIG.STORAGE.USER, response.data.data.user);
        }
        
        return response.data;
    }
    
    async register(userData) {
        const response = await this.post(CONFIG.API.ENDPOINTS.REGISTER, userData);
        
        if (response.data.success) {
            this.setToken(response.data.data.token);
            this.setRefreshToken(response.data.data.refreshToken);
            Utils.storage.set(CONFIG.STORAGE.USER, response.data.data.user);
        }
        
        return response.data;
    }
    
    async logout() {
        try {
            await this.post(CONFIG.API.ENDPOINTS.LOGOUT);
        } catch (error) {
            // Continue with logout even if API call fails
        } finally {
            this.clearTokens();
            Utils.storage.remove(CONFIG.STORAGE.USER);
        }
    }
    
    async getCurrentUser() {
        const response = await this.get(CONFIG.API.ENDPOINTS.ME);
        return response.data;
    }
    
    async smartApiLogin(credentials) {
        const response = await this.post(CONFIG.API.ENDPOINTS.SMARTAPI_LOGIN, credentials);
        return response.data;
    }
    
    async getSmartApiStatus() {
        const response = await this.get(CONFIG.API.ENDPOINTS.SMARTAPI_STATUS);
        return response.data;
    }
    
    // Dashboard API methods
    async getDashboard() {
        const response = await this.get(CONFIG.API.ENDPOINTS.DASHBOARD);
        return response.data;
    }
    
    // Portfolio API methods
    async getPortfolio() {
        const response = await this.get(CONFIG.API.ENDPOINTS.PORTFOLIO);
        return response.data;
    }
    
    async syncPortfolio() {
        const response = await this.post(CONFIG.API.ENDPOINTS.PORTFOLIO_SYNC);
        return response.data;
    }
    
    async updatePortfolioPrices() {
        const response = await this.post(CONFIG.API.ENDPOINTS.PORTFOLIO_UPDATE_PRICES);
        return response.data;
    }
    
    async getPortfolioAnalytics() {
        const response = await this.get(CONFIG.API.ENDPOINTS.PORTFOLIO_ANALYTICS);
        return response.data;
    }
    
    // Market API methods
    async searchInstruments(query, exchange = 'NSE') {
        const response = await this.get(CONFIG.API.ENDPOINTS.MARKET_SEARCH, { q: query, exchange });
        return response.data;
    }
    
    async getLTP(instruments) {
        const response = await this.post(CONFIG.API.ENDPOINTS.MARKET_LTP, { instruments });
        return response.data;
    }
    
    async getHistoricalData(exchange, symbolToken, options = {}) {
        const response = await this.get(
            `${CONFIG.API.ENDPOINTS.MARKET_HISTORICAL}/${exchange}/${symbolToken}`,
            options
        );
        return response.data;
    }
    
    async getMarketStatus() {
        const response = await this.get(CONFIG.API.ENDPOINTS.MARKET_STATUS);
        return response.data;
    }
    
    async getPopularStocks(category = 'nifty50', exchange = 'NSE') {
        const response = await this.get(CONFIG.API.ENDPOINTS.MARKET_POPULAR, { category, exchange });
        return response.data;
    }
    
    async getMarketMovers(type = 'gainers', exchange = 'NSE', limit = 10) {
        const response = await this.get(CONFIG.API.ENDPOINTS.MARKET_MOVERS, { type, exchange, limit });
        return response.data;
    }
    
    // Orders API methods
    async getOrders(params = {}) {
        const response = await this.get(CONFIG.API.ENDPOINTS.ORDERS, params);
        return response.data;
    }
    
    async placeOrder(orderData) {
        const response = await this.post(CONFIG.API.ENDPOINTS.ORDERS, orderData);
        return response.data;
    }
    
    async modifyOrder(orderId, orderData) {
        const response = await this.put(`${CONFIG.API.ENDPOINTS.ORDERS}/${orderId}`, orderData);
        return response.data;
    }
    
    async cancelOrder(orderId) {
        const response = await this.delete(`${CONFIG.API.ENDPOINTS.ORDERS}/${orderId}`);
        return response.data;
    }
    
    async syncOrders() {
        const response = await this.post(CONFIG.API.ENDPOINTS.ORDERS_SYNC);
        return response.data;
    }
    
    async getOrderStats(params = {}) {
        const response = await this.get(CONFIG.API.ENDPOINTS.ORDERS_STATS, params);
        return response.data;
    }
    
    // User API methods
    async updateProfile(profileData) {
        const response = await this.put(CONFIG.API.ENDPOINTS.PROFILE, profileData);
        return response.data;
    }
    
    async getPreferences() {
        const response = await this.get(CONFIG.API.ENDPOINTS.PREFERENCES);
        return response.data;
    }
    
    async updatePreferences(preferences) {
        const response = await this.put(CONFIG.API.ENDPOINTS.PREFERENCES, { preferences });
        return response.data;
    }
    
    async getUserActivity(params = {}) {
        const response = await this.get(CONFIG.API.ENDPOINTS.ACTIVITY, params);
        return response.data;
    }
    
    async getUserStats(params = {}) {
        const response = await this.get(CONFIG.API.ENDPOINTS.STATS, params);
        return response.data;
    }
}

// Create global API instance
window.API = new ApiService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiService;
}
