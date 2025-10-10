/**
 * Global Application Initialization
 * Handles authentication checks and global event listeners
 */

// Elements
let loginSection, dashboardSection;

// Migrate old token storage to new storage keys
function migrateOldTokens() {
    // Check if old token exists
    const oldToken = localStorage.getItem('token');
    const oldUser = localStorage.getItem('user');
    
    if (oldToken && !Utils.storage.get(CONFIG.STORAGE.TOKEN)) {
        console.log('Migrating old token to new storage...');
        Utils.storage.set(CONFIG.STORAGE.TOKEN, oldToken);
        
        if (oldUser) {
            try {
                Utils.storage.set(CONFIG.STORAGE.USER, JSON.parse(oldUser));
            } catch (e) {
                console.error('Failed to migrate user data:', e);
            }
        }
        
        // Clean up old keys
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
        
        console.log('Token migration complete');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Migrate old tokens first
    migrateOldTokens();
    
    // Get DOM elements
    loginSection = document.getElementById('loginSection');
    dashboardSection = document.getElementById('dashboardSection');
    
    // Check authentication state on page load
    checkAuthState();
    
    // Set up global error handling
    setupGlobalErrorHandling();
    
    // Log the current authentication state for debugging
    console.log('Initial auth state:', {
        hasToken: !!Utils.storage.get(CONFIG.STORAGE.TOKEN),
        currentPath: window.location.pathname
    });
});

/**
 * Check authentication state and update UI accordingly
 */
function checkAuthState() {
    const publicPaths = ['/login', '/register', '/forgot-password'];
    const currentPath = window.location.pathname;
    const token = Utils.storage.get(CONFIG.STORAGE.TOKEN);
    
    console.log('Checking auth state:', { currentPath, hasToken: !!token });
    
    // If user is authenticated
    if (token) {
        // Show dashboard, hide login
        if (loginSection) loginSection.classList.add('hidden');
        if (dashboardSection) dashboardSection.classList.remove('hidden');
        
        // If on a public page, redirect to dashboard
        if (publicPaths.some(path => currentPath.includes(path))) {
            window.location.href = '/dashboard';
        }
    } else {
        // Show login, hide dashboard
        if (loginSection) loginSection.classList.remove('hidden');
        if (dashboardSection) dashboardSection.classList.add('hidden');
        
        // If on a protected page, redirect to login
        if (!publicPaths.some(path => currentPath.includes(path)) && currentPath !== '/') {
            window.location.href = '/login';
        }
    }
}

/**
 * Set up global error handling
 */
function setupGlobalErrorHandling() {
    // Global error handler for uncaught exceptions
    window.onerror = function(message, source, lineno, colno, error) {
        console.error('Global error:', { message, source, lineno, colno, error });
        // You might want to show a user-friendly error message here
        return true; // Prevents default browser error handling
    };
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        // You might want to show a user-friendly error message here
        event.preventDefault();
    });
}

// Add this script to your HTML file:
// <script src="/js/app.init.js" type="module"></script>
