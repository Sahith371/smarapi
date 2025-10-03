// Main Application Controller

class SmartApiApp {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.isAuthenticated = false;
        this.refreshIntervals = {};
        
        // Initialize app
        this.init();
    }
    
    /**
     * Initialize the application
     */
    async init() {
        try {
            // Show loading screen
            this.showLoading();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check authentication
            await this.checkAuth();
            
            // Initialize UI
            this.initializeUI();
            
            // Hide loading screen
            this.hideLoading();
            
        } catch (error) {
            console.error('App initialization error:', error);
            this.hideLoading();
            this.showToast('Application initialization failed', 'error');
        }
    }
    
    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Navigation
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('.nav-link');
            if (navLink) {
                e.preventDefault();
                const section = navLink.dataset.section;
                if (section) {
                    this.navigateToSection(section);
                }
            }
        });
        
        // User menu
        const userBtn = document.getElementById('userBtn');
        const userDropdown = document.getElementById('userDropdown');
        
        if (userBtn && userDropdown) {
            userBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });
            
            document.addEventListener('click', () => {
                userDropdown.classList.remove('show');
            });
        }
        
        // Mobile menu
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const navMenu = document.getElementById('navMenu');
        
        if (mobileMenuBtn && navMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                navMenu.classList.toggle('show');
            });
        }
        
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        
        // Window resize
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleResize();
        }, 250));
        
        // Online/offline status
        window.addEventListener('online', () => {
            this.showToast('Connection restored', 'success');
            this.handleOnline();
        });
        
        window.addEventListener('offline', () => {
            this.showToast('Connection lost', 'warning');
            this.handleOffline();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }
    
    /**
     * Check authentication status
     */
    async checkAuth() {
        const token = Utils.storage.get(CONFIG.STORAGE.TOKEN);
        
        if (!token) {
            this.showAuthSection();
            return;
        }
        
        try {
            const response = await API.getCurrentUser();
            
            if (response.success) {
                this.currentUser = response.data.user;
                this.isAuthenticated = true;
                Utils.storage.set(CONFIG.STORAGE.USER, this.currentUser);
                this.showMainApp();
            } else {
                this.showAuthSection();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showAuthSection();
        }
    }
    
    /**
     * Initialize UI components
     */
    initializeUI() {
        if (this.isAuthenticated) {
            this.updateUserInfo();
            this.loadDashboard();
            this.setupRefreshIntervals();
        }
        
        // Initialize theme
        this.initializeTheme();
        
        // Initialize tooltips and other UI components
        this.initializeTooltips();
    }
    
    /**
     * Show loading screen
     */
    showLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }
    
    /**
     * Hide loading screen
     */
    hideLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 500);
        }
    }
    
    /**
     * Show authentication section
     */
    showAuthSection() {
        this.isAuthenticated = false;
        
        // Hide main app sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('hidden');
        });
        
        // Show login section
        const loginSection = document.getElementById('loginSection');
        if (loginSection) {
            loginSection.classList.remove('hidden');
        }
        
        // Hide navbar
        const navbar = document.getElementById('navbar');
        if (navbar) {
            navbar.style.display = 'none';
        }
        
        // Initialize auth handlers
        this.initializeAuth();
    }
    
    /**
     * Show main application
     */
    showMainApp() {
        this.isAuthenticated = true;
        
        // Hide login section
        const loginSection = document.getElementById('loginSection');
        if (loginSection) {
            loginSection.classList.add('hidden');
        }
        
        // Show navbar
        const navbar = document.getElementById('navbar');
        if (navbar) {
            navbar.style.display = 'block';
        }
        
        // Initialize UI components for the newly authenticated user
        this.initializeUI();
    }
    
    /**
     * Navigate to section
     */
    navigateToSection(section) {
        if (!this.isAuthenticated && section !== 'login') {
            this.showAuthSection();
            return;
        }
        
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(s => {
            s.classList.add('hidden');
        });
        
        // Show target section
        const targetSection = document.getElementById(`${section}Section`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            this.currentSection = section;
            
            // Update navigation
            this.updateNavigation(section);
            
            // Load section data
            this.loadSectionData(section);
            
            // Update URL
            Utils.updateUrl({ section });
        }
    }
    
    /**
     * Update navigation active state
     */
    updateNavigation(activeSection) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === activeSection) {
                link.classList.add('active');
            }
        });
    }
    
    /**
     * Load section-specific data
     */
    async loadSectionData(section) {
        try {
            switch (section) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                case 'portfolio':
                    await this.loadPortfolio();
                    break;
                case 'market':
                    await this.loadMarket();
                    break;
                case 'orders':
                    await this.loadOrders();
                    break;
                case 'watchlist':
                    await this.loadWatchlist();
                    break;
                case 'profile':
                    await this.loadProfile();
                    break;
                case 'settings':
                    await this.loadSettings();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${section}:`, error);
            this.showToast(`Failed to load ${section}`, 'error');
        }
    }
    
    /**
     * Load dashboard data
     */
    async loadDashboard() {
        if (window.Dashboard) {
            await window.Dashboard.load();
        }
    }
    
    /**
     * Load portfolio data
     */
    async loadPortfolio() {
        if (window.Portfolio) {
            await window.Portfolio.load();
        }
    }
    
    /**
     * Load market data
     */
    async loadMarket() {
        if (window.Market) {
            await window.Market.load();
        }
    }
    
    /**
     * Load orders data
     */
    async loadOrders() {
        if (window.Orders) {
            await window.Orders.load();
        }
    }
    
    /**
     * Load watchlist data
     */
    async loadWatchlist() {
        // Watchlist functionality to be implemented
        console.log('Loading watchlist...');
    }
    
    /**
     * Load profile data
     */
    async loadProfile() {
        // Profile functionality to be implemented
        console.log('Loading profile...');
    }
    
    /**
     * Load settings data
     */
    async loadSettings() {
        // Settings functionality to be implemented
        console.log('Loading settings...');
    }
    
    /**
     * Update user information in UI
     */
    updateUserInfo() {
        if (!this.currentUser) return;
        
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = this.currentUser.name;
        }
    }
    
    /**
     * Initialize authentication handlers
     */
    initializeAuth() {
        if (window.Auth) {
            window.Auth.init();
        }
    }
    
    /**
     * Initialize theme
     */
    initializeTheme() {
        const savedTheme = Utils.storage.get(CONFIG.APP.THEME.STORAGE_KEY, CONFIG.APP.THEME.DEFAULT);
        this.setTheme(savedTheme);
    }
    
    /**
     * Set theme
     */
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        Utils.storage.set(CONFIG.APP.THEME.STORAGE_KEY, theme);
    }
    
    /**
     * Toggle theme
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }
    
    /**
     * Initialize tooltips
     */
    initializeTooltips() {
        // Tooltip functionality can be added here
    }
    
    /**
     * Setup refresh intervals
     */
    setupRefreshIntervals() {
        // Clear existing intervals
        this.clearRefreshIntervals();
        
        // Dashboard refresh
        this.refreshIntervals.dashboard = setInterval(() => {
            if (this.currentSection === 'dashboard') {
                this.loadDashboard();
            }
        }, CONFIG.UI.REFRESH_INTERVALS.DASHBOARD);
        
        // Portfolio refresh
        this.refreshIntervals.portfolio = setInterval(() => {
            if (this.currentSection === 'portfolio') {
                this.loadPortfolio();
            }
        }, CONFIG.UI.REFRESH_INTERVALS.PORTFOLIO);
        
        // Market data refresh
        this.refreshIntervals.market = setInterval(() => {
            if (this.currentSection === 'market') {
                this.loadMarket();
            }
        }, CONFIG.UI.REFRESH_INTERVALS.MARKET_DATA);
        
        // Orders refresh
        this.refreshIntervals.orders = setInterval(() => {
            if (this.currentSection === 'orders') {
                this.loadOrders();
            }
        }, CONFIG.UI.REFRESH_INTERVALS.ORDERS);
    }
    
    /**
     * Clear refresh intervals
     */
    clearRefreshIntervals() {
        Object.values(this.refreshIntervals).forEach(interval => {
            clearInterval(interval);
        });
        this.refreshIntervals = {};
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        // Handle responsive behavior
        const deviceType = Utils.getDeviceType();
        document.body.setAttribute('data-device', deviceType);
    }
    
    /**
     * Handle online status
     */
    handleOnline() {
        // Refresh data when coming back online
        this.loadSectionData(this.currentSection);
    }
    
    /**
     * Handle offline status
     */
    handleOffline() {
        // Handle offline mode
        this.clearRefreshIntervals();
    }
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            // Open search modal
            console.log('Search shortcut');
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            this.closeModals();
        }
    }
    
    /**
     * Close all modals
     */
    closeModals() {
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
        });
    }
    
    /**
     * Logout user
     */
    async logout() {
        try {
            await API.logout();
            
            // Clear intervals
            this.clearRefreshIntervals();
            
            // Reset state
            this.currentUser = null;
            this.isAuthenticated = false;
            
            // Show auth section
            this.showAuthSection();
            
            this.showToast('Logged out successfully', 'success');
            
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Logout failed', 'error');
        }
    }
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'info', title = null) {
        if (window.Toast) {
            window.Toast.show(message, type, title);
        } else {
            console.log(`${type.toUpperCase()}: ${title ? title + ' - ' : ''}${message}`);
        }
    }
    
    /**
     * Show confirmation dialog
     */
    showConfirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const result = confirm(`${title}\n\n${message}`);
            resolve(result);
        });
    }
    
    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Check if user is authenticated
     */
    isUserAuthenticated() {
        return this.isAuthenticated;
    }
    
    /**
     * Set current user
     */
    setCurrentUser(user) {
        this.currentUser = user;
        this.isAuthenticated = true;
        Utils.storage.set(CONFIG.STORAGE.USER, user);
    }

    /**
     * Initialize dashboard after login
     */
    async initializeDashboard() {
        this.updateUserInfo();
        await this.loadDashboard();
        this.setupRefreshIntervals();
    }

    /**
     * Get current section
     */
    getCurrentSection() {
        return this.currentSection;
    }
}

// Toast Notification System
class Toast {
    static container = null;
    static toasts = [];
    
    static init() {
        if (!this.container) {
            this.container = document.getElementById('toastContainer');
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'toastContainer';
                this.container.className = 'toast-container';
                document.body.appendChild(this.container);
            }
        }
    }
    
    static show(message, type = 'info', title = null, duration = CONFIG.UI.TOAST.DURATION) {
        this.init();
        
        const toast = this.createToast(message, type, title);
        this.container.appendChild(toast);
        this.toasts.push(toast);
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            this.remove(toast);
        }, duration);
        
        // Limit number of toasts
        if (this.toasts.length > CONFIG.UI.TOAST.MAX_TOASTS) {
            this.remove(this.toasts[0]);
        }
    }
    
    static createToast(message, type, title) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${icons[type] || icons.info}"></i>
            </div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${Utils.sanitizeHtml(title)}</div>` : ''}
                <div class="toast-message">${Utils.sanitizeHtml(message)}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this.remove(toast);
        });
        
        return toast;
    }
    
    static remove(toast) {
        if (!toast || !toast.parentNode) return;
        
        toast.classList.remove('show');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            
            const index = this.toasts.indexOf(toast);
            if (index > -1) {
                this.toasts.splice(index, 1);
            }
        }, 300);
    }
    
    static clear() {
        this.toasts.forEach(toast => this.remove(toast));
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global instances
    window.App = new SmartApiApp();
    window.Toast = Toast;
    
    // Initialize toast system
    Toast.init();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (window.App) {
        if (document.hidden) {
            window.App.clearRefreshIntervals();
        } else {
            window.App.setupRefreshIntervals();
        }
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SmartApiApp, Toast };
}
