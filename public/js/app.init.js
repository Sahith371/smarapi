/**
 * Global Application Initialization
 * Handles authentication checks and global event listeners
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication state on page load
    checkAuthState();
    
    // Set up global error handling
    setupGlobalErrorHandling();
});

/**
 * Check authentication state and redirect if needed
 */
function checkAuthState() {
    const publicPaths = ['/login', '/register', '/forgot-password'];
    const currentPath = window.location.pathname;
    
    // Skip auth check for public paths
    if (publicPaths.some(path => currentPath.startsWith(path))) {
        return;
    }
    
    const token = localStorage.getItem('token') || Utils.storage.get(CONFIG.STORAGE.TOKEN);
    
    // If no token and not on a public page, redirect to login
    if (!token && !publicPaths.includes(currentPath)) {
        window.location.href = '/login';
        return;
    }
    
    // If token exists and we're on login/register page, redirect to dashboard
    if (token && publicPaths.some(path => currentPath.startsWith(path))) {
        window.location.href = '/dashboard';
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
