// Utility Functions

/**
 * Format currency values
 */
const formatCurrency = (amount, currency = '₹', decimals = 2) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return `${currency}0.00`;
    }
    
    const num = parseFloat(amount);
    const formatted = num.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
    
    return `${currency}${formatted}`;
};

/**
 * Format percentage values
 */
const formatPercentage = (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '0.00%';
    }
    
    const num = parseFloat(value);
    return `${num.toFixed(decimals)}%`;
};

/**
 * Format large numbers with K, M, B suffixes
 */
const formatNumber = (num, decimals = 1) => {
    if (num === null || num === undefined || isNaN(num)) {
        return '0';
    }
    
    const absNum = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    
    if (absNum >= 1e9) {
        return `${sign}${(absNum / 1e9).toFixed(decimals)}B`;
    } else if (absNum >= 1e6) {
        return `${sign}${(absNum / 1e6).toFixed(decimals)}M`;
    } else if (absNum >= 1e3) {
        return `${sign}${(absNum / 1e3).toFixed(decimals)}K`;
    }
    
    return `${sign}${absNum.toFixed(decimals)}`;
};

/**
 * Format date and time
 */
const formatDate = (date, options = {}) => {
    if (!date) return '';
    
    const d = new Date(date);
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return d.toLocaleDateString('en-IN', { ...defaultOptions, ...options });
};

/**
 * Format time only
 */
const formatTime = (date) => {
    if (!date) return '';
    
    const d = new Date(date);
    return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

/**
 * Get relative time (e.g., "2 minutes ago")
 */
const getRelativeTime = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
        return formatDate(date, { hour: undefined, minute: undefined });
    }
};

/**
 * Debounce function
 */
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Throttle function
 */
const throttle = (func, limit) => {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

/**
 * Deep clone object
 */
const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
};

/**
 * Generate unique ID
 */
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Validate email
 */
const isValidEmail = (email) => {
    return CONFIG.VALIDATION.EMAIL.PATTERN.test(email);
};

/**
 * Validate phone number
 */
const isValidPhone = (phone) => {
    return CONFIG.VALIDATION.PHONE.PATTERN.test(phone);
};

/**
 * Validate password
 */
const isValidPassword = (password) => {
    return password && password.length >= CONFIG.VALIDATION.PASSWORD.MIN_LENGTH;
};

/**
 * Validate client code
 */
const isValidClientCode = (clientCode) => {
    return CONFIG.VALIDATION.CLIENT_CODE.PATTERN.test(clientCode);
};

/**
 * Get color for P&L values
 */
const getPnLColor = (value) => {
    if (value > 0) return 'var(--success-color)';
    if (value < 0) return 'var(--danger-color)';
    return 'var(--text-muted)';
};

/**
 * Get CSS class for P&L values
 */
const getPnLClass = (value) => {
    if (value > 0) return 'text-success';
    if (value < 0) return 'text-danger';
    return 'text-muted';
};

/**
 * Calculate percentage change
 */
const calculatePercentageChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
};

/**
 * Sanitize HTML to prevent XSS
 */
const sanitizeHtml = (str) => {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
};

/**
 * Copy text to clipboard
 */
const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            return true;
        } catch (err) {
            return false;
        } finally {
            document.body.removeChild(textArea);
        }
    }
};

/**
 * Download data as file
 */
const downloadFile = (data, filename, type = 'application/json') => {
    const blob = new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

/**
 * Get query parameters from URL
 */
const getQueryParams = () => {
    const params = {};
    const searchParams = new URLSearchParams(window.location.search);
    for (const [key, value] of searchParams) {
        params[key] = value;
    }
    return params;
};

/**
 * Update URL without page reload
 */
const updateUrl = (params) => {
    const url = new URL(window.location);
    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
            url.searchParams.set(key, params[key]);
        } else {
            url.searchParams.delete(key);
        }
    });
    window.history.replaceState({}, '', url);
};

/**
 * Check if device is mobile
 */
const isMobile = () => {
    return window.innerWidth <= 768;
};

/**
 * Check if device is tablet
 */
const isTablet = () => {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
};

/**
 * Check if device is desktop
 */
const isDesktop = () => {
    return window.innerWidth > 1024;
};

/**
 * Get device type
 */
const getDeviceType = () => {
    if (isMobile()) return 'mobile';
    if (isTablet()) return 'tablet';
    return 'desktop';
};

/**
 * Format file size
 */
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Check if string is JSON
 */
const isJSON = (str) => {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * Capitalize first letter
 */
const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convert camelCase to Title Case
 */
const camelToTitle = (str) => {
    return str
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
};

/**
 * Truncate text
 */
const truncateText = (text, maxLength = 50) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

/**
 * Generate random color
 */
const generateRandomColor = () => {
    const colors = [
        '#2563eb', '#7c3aed', '#dc2626', '#ea580c',
        '#d97706', '#ca8a04', '#65a30d', '#16a34a',
        '#059669', '#0891b2', '#0284c7', '#2563eb'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Sleep/delay function
 */
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry function with exponential backoff
 */
const retry = async (fn, maxRetries = 3, delay = 1000) => {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                await sleep(delay * Math.pow(2, i));
            }
        }
    }
    
    throw lastError;
};

/**
 * Local storage helpers
 */
const storage = {
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    },
    
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error writing to localStorage:', error);
            return false;
        }
    },
    
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },
    
    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }
};

/**
 * Session storage helpers
 */
const sessionStorage = {
    get: (key, defaultValue = null) => {
        try {
            const item = window.sessionStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from sessionStorage:', error);
            return defaultValue;
        }
    },
    
    set: (key, value) => {
        try {
            window.sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error writing to sessionStorage:', error);
            return false;
        }
    },
    
    remove: (key) => {
        try {
            window.sessionStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from sessionStorage:', error);
            return false;
        }
    }
};

// Export utilities
window.Utils = {
    formatCurrency,
    formatPercentage,
    formatNumber,
    formatDate,
    formatTime,
    getRelativeTime,
    debounce,
    throttle,
    deepClone,
    generateId,
    isValidEmail,
    isValidPhone,
    isValidPassword,
    isValidClientCode,
    getPnLColor,
    getPnLClass,
    calculatePercentageChange,
    sanitizeHtml,
    copyToClipboard,
    downloadFile,
    getQueryParams,
    updateUrl,
    isMobile,
    isTablet,
    isDesktop,
    getDeviceType,
    formatFileSize,
    isJSON,
    capitalize,
    camelToTitle,
    truncateText,
    generateRandomColor,
    sleep,
    retry,
    storage,
    sessionStorage
};
