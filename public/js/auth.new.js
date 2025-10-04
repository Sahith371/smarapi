// Authentication Module

class AuthManager {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.smartApiModal = document.getElementById('smartApiModal');
        this.smartApiForm = document.getElementById('smartApiForm');
        this.isLoading = false;
        
        // Initialize the auth manager
        this.init();
    }
    
    /**
     * Initialize authentication
     */
    init() {
        this.setupEventListeners();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Login form
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // Register form
        if (this.registerForm) {
            this.registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }
        
        // SmartAPI form
        if (this.smartApiForm) {
            this.smartApiForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSmartApiLogin();
            });
        }
        
        // SmartAPI modal controls
        const smartApiModalClose = document.getElementById('smartApiModalClose');
        const smartApiCancel = document.getElementById('smartApiCancel');
        
        if (smartApiModalClose) {
            smartApiModalClose.addEventListener('click', () => {
                this.hideSmartApiModal();
            });
        }
        
        if (smartApiCancel) {
            smartApiCancel.addEventListener('click', () => {
                this.hideSmartApiModal();
            });
        }
        
        // Close modal on backdrop click
        if (this.smartApiModal) {
            this.smartApiModal.addEventListener('click', (e) => {
                if (e.target === this.smartApiModal) {
                    this.hideSmartApiModal();
                }
            });
        }
    }
    
    /**
     * Handle login form submission
     */
    async handleLogin() {
        if (this.isLoading) return;
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        // Basic validation
        if (!email || !password) {
            this.showToast('Please enter both email and password', 'error');
            return;
        }
        
        this.setLoading(true);
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }
            
            if (!data.token) {
                throw new Error('No authentication token received');
            }
            
            // Store authentication data
            this.storeAuthData(data);
            
            // Show success message
            this.showToast('Login successful!', 'success');
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
            
        } catch (error) {
            console.error('Login error:', error);
            this.showToast(error.message || 'Login failed. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Handle registration form submission
     */
    async handleRegister() {
        if (this.isLoading) return;
        
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const phone = document.getElementById('registerPhone').value.trim();
        const clientCode = document.getElementById('registerClientCode').value.trim();
        const password = document.getElementById('registerPassword').value;
        
        // Basic validation
        if (!name || !email || !phone || !clientCode || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }
        
        this.setLoading(true);
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    email,
                    phone,
                    clientCode,
                    password
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }
            
            // Store authentication data
            this.storeAuthData(data);
            
            // Show success message
            this.showToast('Registration successful!', 'success');
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showToast(error.message || 'Registration failed. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Handle SmartAPI login
     */
    async handleSmartApiLogin() {
        if (this.isLoading) return;
        
        const password = document.getElementById('smartApiPassword').value;
        const totp = document.getElementById('smartApiTotp').value;
        
        // Basic validation
        if (!password || !totp) {
            this.showToast('Please enter both password and TOTP', 'error');
            return;
        }
        
        this.setLoading(true);
        
        try {
            const response = await fetch('/api/auth/smartapi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ password, totp })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'SmartAPI connection failed');
            }
            
            // Show success message and close modal
            this.showToast('Successfully connected to SmartAPI!', 'success');
            this.hideSmartApiModal();
            
        } catch (error) {
            console.error('SmartAPI login error:', error);
            this.showToast(error.message || 'Failed to connect to SmartAPI', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Store authentication data
     */
    storeAuthData(data) {
        // Store in localStorage
        if (data.token) {
            localStorage.setItem('token', data.token);
        }
        
        if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        // Also store in the API service if available
        if (window.API) {
            if (window.API.setToken && data.token) {
                window.API.setToken(data.token);
            }
            
            if (data.refreshToken && window.API.setRefreshToken) {
                window.API.setRefreshToken(data.refreshToken);
            }
        }
        
        // Set a flag to indicate the user is logged in
        localStorage.setItem('isAuthenticated', 'true');
    }
    
    /**
     * Clear authentication data
     */
    clearAuthData() {
        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
        
        // Clear from API service if available
        if (window.API) {
            if (window.API.setToken) {
                window.API.setToken(null);
            }
            
            if (window.API.setRefreshToken) {
                window.API.setRefreshToken(null);
            }
            
            if (window.API.handleAuthError) {
                window.API.handleAuthError();
            }
        }
    }
    
    /**
     * Logout the user
     */
    async logout() {
        try {
            // Call the logout API
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear auth data regardless of API call result
            this.clearAuthData();
            
            // Redirect to login page
            window.location.href = '/login';
        }
    }
    
    /**
     * Show SmartAPI modal
     */
    showSmartApiModal() {
        if (this.smartApiModal) {
            this.smartApiModal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            // Focus on the first input
            const firstInput = this.smartApiForm.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }
    
    /**
     * Hide SmartAPI modal
     */
    hideSmartApiModal() {
        if (this.smartApiModal) {
            this.smartApiModal.classList.remove('show');
            document.body.style.overflow = '';
            
            // Reset form
            if (this.smartApiForm) {
                this.smartApiForm.reset();
            }
        }
    }
    
    /**
     * Switch between login and register tabs
     */
    switchTab(tab) {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        // Show/hide forms
        if (tab === 'login') {
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('registerForm').classList.add('hidden');
        } else {
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('registerForm').classList.remove('hidden');
        }
    }
    
    /**
     * Set loading state
     */
    setLoading(isLoading) {
        this.isLoading = isLoading;
        
        // Disable/enable form inputs
        const forms = [this.loginForm, this.registerForm, this.smartApiForm];
        forms.forEach(form => {
            if (form) {
                const inputs = form.querySelectorAll('input, button');
                inputs.forEach(input => {
                    input.disabled = isLoading;
                });
            }
        });
        
        // Show/hide loading indicators
        document.querySelectorAll('.btn-loading').forEach(btn => {
            btn.disabled = isLoading;
            const spinner = btn.querySelector('.spinner-border');
            if (spinner) {
                spinner.style.display = isLoading ? 'inline-block' : 'none';
            }
        });
    }
    
    /**
     * Show toast message
     */
    showToast(message, type = 'info') {
        // You can implement a toast notification system here
        // For now, we'll just use alert as a fallback
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.Auth = new AuthManager();
});
