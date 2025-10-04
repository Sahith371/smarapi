// API Service Layer

class ApiService {
    constructor() {
        this.baseURL = CONFIG.API.BASE_URL || '';
        this.token = null;
        this.refreshToken = null;
        this.updateTokens();
        
        // Request interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        // Setup default interceptors
        this.setupInterceptors();
    }
    
    /**
     * Update tokens from storage
     */
    updateTokens() {
        this.token = Utils.storage.get(CONFIG.STORAGE.TOKEN);
        this.refreshToken = Utils.storage.get(CONFIG.STORAGE.REFRESH_TOKEN);
    }
    
    /**
     * Setup request/response interceptors
     */
    setupInterceptors() {
        // Add auth token to requests
        this.addRequestInterceptor((config) => {
            // Ensure we have the latest token
            this.updateTokens();
            
            // Add Authorization header if token exists
            if (this.token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${this.token}`;
            }
            
            // Add content type if not set
            if (!config.headers['Content-Type']) {
                config.headers['Content-Type'] = 'application/json';
            }
            
            // Add credentials for cookies
            config.credentials = 'include';
            
            return config;
        });
        
        // Handle token refresh on 401
        this.addResponseInterceptor(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;
                
                // If error is 401 and we haven't already tried to refresh the token
                if (error.status === 401 && this.refreshToken && !originalRequest._retry) {
                    try {
                        // Mark the request as retried
                        originalRequest._retry = true;
                        
                        // Try to refresh the token
                        await this.refreshAccessToken();
                        
                        // Update the Authorization header with the new token
                        originalRequest.headers.Authorization = `Bearer ${this.token}`;
                        
                        // Retry the original request
                        return this.request(originalRequest);
                    } catch (refreshError) {
                        console.error('Token refresh failed:', refreshError);
                        this.handleAuthError();
                        
                        // Redirect to login page on auth error
                        if (window.location.pathname !== '/login') {
                            window.location.href = '/login';
                        }
                        
                        throw refreshError;
                    }
                }
                
                // If we've already tried to refresh the token or there's no refresh token
                if (error.status === 401) {
                    this.handleAuthError();
                    
                    // Redirect to login page on auth error
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                }
                
                // Handle network errors
                if (!error.status) {
                    console.error('Network error:', error);
                    // You might want to show a network error message to the user
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
     * Handle authentication error
     */
    handleAuthError() {
        this.token = null;
        this.refreshToken = null;
        
        // Clear storage
        Utils.storage.remove(CONFIG.STORAGE.TOKEN);
        Utils.storage.remove(CONFIG.STORAGE.REFRESH_TOKEN);
        
        // Clear localStorage (for backward compatibility)
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }
    
    /**
     * Refresh access token
     */
    async refreshAccessToken() {
        try {
            const response = await makeRequest('POST', '/auth/refresh-token', {
                refreshToken: this.refreshToken
            });
            
            if (response.data.token) {
                this.setToken(response.data.token);
            }
            
            if (response.data.refreshToken) {
                this.setRefreshToken(response.data.refreshToken);
            }
            
            return response.data;
            
            return data;
        } catch (error) {
            console.error('Token refresh failed:', error);
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
            window.location.href = '/login';
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
    
    async getDashboard() {
        const response = await this.get(CONFIG.API.ENDPOINTS.DASHBOARD);
        return response.data;
    }
    
    // Add other API methods as needed...
}

// Create global API instance
window.API = new ApiService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiService;
}
