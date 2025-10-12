// ===============================
// ✅ API Service Layer (Fixed)
// ===============================

class ApiService {
    constructor() {
        this.baseURL = CONFIG.API.BASE_URL || '';
        this.token = null;
        this.refreshToken = null;
        this.updateTokens();

        // Request and response interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];

        // Setup default interceptors
        this.setupInterceptors();
    }

    /** 🔄 Update tokens from storage */
    updateTokens() {
        this.token = Utils.storage.get(CONFIG.STORAGE.TOKEN);
        this.refreshToken = Utils.storage.get(CONFIG.STORAGE.REFRESH_TOKEN);
    }

    /** ⚙️ Setup request/response interceptors */
    setupInterceptors() {
        // ✅ Request Interceptor
        this.addRequestInterceptor((config) => {
            // Ensure config object exists
            config = config || {};
            config.headers = config.headers || {};

            // Update tokens
            this.updateTokens();

            // Add Authorization header
            if (this.token) {
                config.headers.Authorization = `Bearer ${this.token}`;
            }

            // Add Content-Type header if not set
            if (!config.headers['Content-Type']) {
                config.headers['Content-Type'] = 'application/json';
            }

            // Include cookies
            config.credentials = 'include';

            return config;
        });

        // ✅ Response Interceptor for 401 handling
        this.addResponseInterceptor(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;

                // Refresh token on 401
                if (error.status === 401 && this.refreshToken && !originalRequest?._retry) {
                    try {
                        originalRequest._retry = true;
                        await this.refreshAccessToken();

                        // Retry original request with new token
                        originalRequest.headers = originalRequest.headers || {};
                        originalRequest.headers.Authorization = `Bearer ${this.token}`;
                        return this.request(originalRequest);
                    } catch (refreshError) {
                        console.error('Token refresh failed:', refreshError);
                        this.handleAuthError();
                        throw refreshError;
                    }
                }

                // Handle 401 if no refresh token
                if (error.status === 401) {
                    this.handleAuthError();
                }

                // Handle network issues
                if (!error.status) {
                    console.error('Network error:', error);
                }

                throw error;
            }
        );
    }

    /** ➕ Add Request Interceptor */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    /** ➕ Add Response Interceptor */
    addResponseInterceptor(onSuccess, onError) {
        this.responseInterceptors.push({ onSuccess, onError });
    }

    /** 🧩 Apply Request Interceptors (safe) */
    applyRequestInterceptors(config) {
        return this.requestInterceptors.reduce((cfg, interceptor) => {
            return interceptor(cfg || {});
        }, config || {});
    }

    /** 🧩 Apply Response Interceptors */
    async applyResponseInterceptors(response, isError = false) {
        for (const interceptor of this.responseInterceptors) {
            try {
                if (isError && interceptor.onError) {
                    response = await interceptor.onError(response);
                } else if (!isError && interceptor.onSuccess) {
                    response = await interceptor.onSuccess(response);
                }
            } catch (err) {
                throw err;
            }
        }
        return response;
    }

    /** 🌐 Main Request Method */
    async request(config) {
        try {
            // Apply interceptors safely
            config = this.applyRequestInterceptors(config);

            console.log('Making API request:', {
                url: config.url,
                method: config.method || 'GET',
                hasToken: !!this.token
            });

            // Merge headers safely
            const headers = {
                'Content-Type': 'application/json',
                ...(config.headers || {})
            };

            const options = {
                method: config.method || 'GET',
                headers,
                credentials: 'include'
            };

            // Add request body for non-GET methods
            if (config.data && options.method !== 'GET') {
                options.body = JSON.stringify(config.data);
            }

            console.log('Fetching:', config.url, options);
            const response = await fetch(config.url, options);
            console.log('Response received:', response.status, response.statusText);

            // Parse response safely
            let data;
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }
            } catch (parseError) {
                console.error('Failed to parse response:', parseError);
                data = null;
            }

            const result = {
                data,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                config
            };

            // Handle non-OK responses
            if (!response.ok) {
                const error = new Error(data?.message || response.statusText);
                error.response = result;
                error.status = response.status;
                error.config = config;

                throw await this.applyResponseInterceptors(error, true);
            }

            return await this.applyResponseInterceptors(result);

        } catch (error) {
            console.error('API Request Error:', {
                url: config?.url,
                method: config?.method,
                error: error.message,
                name: error.name,
                stack: error.stack
            });

            if (!error.status) {
                error.status = 0;
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    error.message = `Network error: Cannot connect to ${config?.url}. Is the server running?`;
                } else {
                    error.message = error.message || 'Network error. Please check your connection.';
                }
            }

            throw error;
        }
    }

    // ===============================
    // 🧭 HTTP Methods
    // ===============================

    async get(url, params = {}, config = {}) {
        const query = new URLSearchParams(params).toString();
        const fullUrl = query ? `${url}?${query}` : url;

        return this.request({
            method: 'GET',
            url: this.baseURL + fullUrl,
            ...config
        });
    }

    async post(url, data = {}, config = {}) {
        return this.request({
            method: 'POST',
            url: this.baseURL + url,
            data,
            ...config
        });
    }

    async put(url, data = {}, config = {}) {
        return this.request({
            method: 'PUT',
            url: this.baseURL + url,
            data,
            ...config
        });
    }

    async delete(url, config = {}) {
        return this.request({
            method: 'DELETE',
            url: this.baseURL + url,
            ...config
        });
    }

    // ===============================
    // 🔐 Auth & Token Handling
    // ===============================

    setToken(token) {
        this.token = token;
        Utils.storage.set(CONFIG.STORAGE.TOKEN, token);
    }

    setRefreshToken(refreshToken) {
        this.refreshToken = refreshToken;
        Utils.storage.set(CONFIG.STORAGE.REFRESH_TOKEN, refreshToken);
    }

    clearTokens() {
        this.token = null;
        this.refreshToken = null;
        Utils.storage.remove(CONFIG.STORAGE.TOKEN);
        Utils.storage.remove(CONFIG.STORAGE.REFRESH_TOKEN);
    }

    handleAuthError() {
        this.clearTokens();
        Utils.storage.remove(CONFIG.STORAGE.USER);
        if (!window.location.pathname.includes('login')) {
            window.location.href = '/login';
        }
    }

    async refreshAccessToken() {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (!response.ok) throw new Error('Failed to refresh token');

            const data = await response.json();

            if (data.success && data.data.token) {
                this.setToken(data.data.token);
            }
            if (data.success && data.data.refreshToken) {
                this.setRefreshToken(data.data.refreshToken);
            }

            return data;
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.handleAuthError();
            throw error;
        }
    }

    // ===============================
    // 🧾 Auth API Methods
    // ===============================

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
        } catch {
            // continue logout even if API fails
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

    async getMarketStatus() {
        try {
            const response = await this.get('/api/market/status');
            return response.data;
        } catch (error) {
            console.error('Market status error:', error);
            return {
                success: false,
                data: {
                    status: 'Unknown',
                    currentTime: new Date().toLocaleTimeString()
                }
            };
        }
    }

    async syncPortfolio() {
        const response = await this.post('/api/portfolio/sync');
        return response.data;
    }

    async getPortfolio() {
        const response = await this.get('/api/portfolio');
        return response.data;
    }

    async getOrders(params = {}) {
        const response = await this.get('/api/orders', params);
        return response.data;
    }

    async getMarketData(symbol) {
        const response = await this.get(`/api/market/quote/${symbol}`);
        return response.data;
    }
}

// 🌍 Create global API instance
window.API = new ApiService();

// 📦 Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiService;
}
