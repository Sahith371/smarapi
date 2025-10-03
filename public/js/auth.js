// Authentication Module

class AuthManager {
    constructor() {
        this.loginForm = null;
        this.registerForm = null;
        this.smartApiModal = null;
        this.smartApiForm = null;
        
        this.isLoading = false;
    }
    
    /**
     * Initialize authentication
     */
    init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupValidation();
    }
    
    /**
     * Setup DOM elements
     */
    setupElements() {
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.smartApiModal = document.getElementById('smartApiModal');
        this.smartApiForm = document.getElementById('smartApiForm');
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
     * Setup form validation
     */
    setupValidation() {
        // Real-time validation for login form
        if (this.loginForm) {
            const emailInput = this.loginForm.querySelector('#loginEmail');
            const passwordInput = this.loginForm.querySelector('#loginPassword');
            
            if (emailInput) {
                emailInput.addEventListener('blur', () => {
                    this.validateEmail(emailInput);
                });
            }
            
            if (passwordInput) {
                passwordInput.addEventListener('blur', () => {
                    this.validatePassword(passwordInput);
                });
            }
        }
        
        // Real-time validation for register form
        if (this.registerForm) {
            const nameInput = this.registerForm.querySelector('#registerName');
            const emailInput = this.registerForm.querySelector('#registerEmail');
            const phoneInput = this.registerForm.querySelector('#registerPhone');
            const clientCodeInput = this.registerForm.querySelector('#registerClientCode');
            const passwordInput = this.registerForm.querySelector('#registerPassword');
            
            if (nameInput) {
                nameInput.addEventListener('blur', () => {
                    this.validateName(nameInput);
                });
            }
            
            if (emailInput) {
                emailInput.addEventListener('blur', () => {
                    this.validateEmail(emailInput);
                });
            }
            
            if (phoneInput) {
                phoneInput.addEventListener('blur', () => {
                    this.validatePhone(phoneInput);
                });
            }
            
            if (clientCodeInput) {
                clientCodeInput.addEventListener('blur', () => {
                    this.validateClientCode(clientCodeInput);
                });
            }
            
            if (passwordInput) {
                passwordInput.addEventListener('blur', () => {
                    this.validatePassword(passwordInput);
                });
            }
        }
    }
    
    /**
     * Switch between login and register tabs
     */
    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            }
        });
        
        // Show/hide forms
        if (this.loginForm && this.registerForm) {
            if (tab === 'login') {
                this.loginForm.classList.remove('hidden');
                this.registerForm.classList.add('hidden');
            } else {
                this.loginForm.classList.add('hidden');
                this.registerForm.classList.remove('hidden');
            }
        }
        
        // Clear form errors
        this.clearFormErrors();
    }
    
    /**
     * Handle login
     */
    async handleLogin() {
        if (this.isLoading) return;
        
        const formData = new FormData(this.loginForm);
        const credentials = {
            email: formData.get('loginEmail'),
            password: formData.get('loginPassword')
        };
        
        // Validate form
        if (!this.validateLoginForm(credentials)) {
            return;
        }
        
        try {
            this.setLoading(true);
            this.clearFormErrors();
            
            const response = await API.login(credentials);
            
            if (response.success) {
                Toast.show(CONFIG.SUCCESS.LOGIN, 'success');
                
                // Check if SmartAPI connection is needed
                if (!response.data.user.hasSmartApiToken) {
                    setTimeout(() => {
                        this.showSmartApiModal();
                    }, 1000);
                }
                
                // Redirect to main app
                window.App.showMainApp();
                window.App.currentUser = response.data.user;
                
            } else {
                this.showFormError(response.message || 'Login failed');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showFormError(error.message || CONFIG.ERRORS.SERVER_ERROR);
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Handle registration
     */
    async handleRegister() {
        if (this.isLoading) return;
        
        const formData = new FormData(this.registerForm);
        const userData = {
            name: formData.get('registerName'),
            email: formData.get('registerEmail'),
            phone: formData.get('registerPhone'),
            clientCode: formData.get('registerClientCode'),
            password: formData.get('registerPassword')
        };
        
        // Validate form
        if (!this.validateRegisterForm(userData)) {
            return;
        }
        
        try {
            this.setLoading(true);
            this.clearFormErrors();
            
            const response = await API.register(userData);
            
            if (response.success) {
                Toast.show(CONFIG.SUCCESS.REGISTER, 'success');
                
                // Show SmartAPI connection modal
                setTimeout(() => {
                    this.showSmartApiModal();
                }, 1000);
                
                // Redirect to main app
                window.App.showMainApp();
                window.App.currentUser = response.data.user;
                
            } else {
                this.showFormError(response.message || 'Registration failed');
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showFormError(error.message || CONFIG.ERRORS.SERVER_ERROR);
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Handle SmartAPI login
     */
    async handleSmartApiLogin() {
        if (this.isLoading) return;
        
        const formData = new FormData(this.smartApiForm);
        const credentials = {
            password: formData.get('smartApiPassword'),
            totp: formData.get('smartApiTotp')
        };
        
        // Validate form
        if (!credentials.password || !credentials.totp) {
            this.showSmartApiError('Please fill all fields');
            return;
        }
        
        if (credentials.totp.length !== 6) {
            this.showSmartApiError('TOTP must be 6 digits');
            return;
        }
        
        try {
            this.setLoading(true);
            this.clearSmartApiErrors();
            
            const response = await API.smartApiLogin(credentials);
            
            if (response.success) {
                Toast.show(CONFIG.SUCCESS.SMARTAPI_CONNECTED, 'success');
                this.hideSmartApiModal();
                
                // Refresh user data
                if (window.App.currentUser) {
                    window.App.currentUser.hasSmartApiToken = true;
                }
                
            } else {
                this.showSmartApiError(response.message || 'SmartAPI connection failed');
            }
            
        } catch (error) {
            console.error('SmartAPI login error:', error);
            this.showSmartApiError(error.message || CONFIG.ERRORS.SMARTAPI_CONNECTION);
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Show SmartAPI connection modal
     */
    showSmartApiModal() {
        if (this.smartApiModal) {
            this.smartApiModal.classList.add('show');
            
            // Focus on password field
            const passwordInput = this.smartApiForm.querySelector('#smartApiPassword');
            if (passwordInput) {
                setTimeout(() => passwordInput.focus(), 300);
            }
        }
    }
    
    /**
     * Hide SmartAPI connection modal
     */
    hideSmartApiModal() {
        if (this.smartApiModal) {
            this.smartApiModal.classList.remove('show');
            this.clearSmartApiErrors();
            this.smartApiForm.reset();
        }
    }
    
    /**
     * Validate login form
     */
    validateLoginForm(credentials) {
        let isValid = true;
        
        if (!credentials.email || !Utils.isValidEmail(credentials.email)) {
            this.showFieldError('loginEmail', 'Please enter a valid email address');
            isValid = false;
        }
        
        if (!credentials.password || credentials.password.length < 6) {
            this.showFieldError('loginPassword', 'Password must be at least 6 characters');
            isValid = false;
        }
        
        return isValid;
    }
    
    /**
     * Validate register form
     */
    validateRegisterForm(userData) {
        let isValid = true;
        
        if (!userData.name || userData.name.trim().length < 2) {
            this.showFieldError('registerName', 'Name must be at least 2 characters');
            isValid = false;
        }
        
        if (!userData.email || !Utils.isValidEmail(userData.email)) {
            this.showFieldError('registerEmail', 'Please enter a valid email address');
            isValid = false;
        }
        
        if (!userData.phone || !Utils.isValidPhone(userData.phone)) {
            this.showFieldError('registerPhone', 'Please enter a valid 10-digit phone number');
            isValid = false;
        }
        
        if (!userData.clientCode || !Utils.isValidClientCode(userData.clientCode)) {
            this.showFieldError('registerClientCode', 'Please enter a valid client code');
            isValid = false;
        }
        
        if (!userData.password || !Utils.isValidPassword(userData.password)) {
            this.showFieldError('registerPassword', 'Password must be at least 6 characters');
            isValid = false;
        }
        
        return isValid;
    }
    
    /**
     * Validate individual fields
     */
    validateName(input) {
        const value = input.value.trim();
        if (value.length < 2) {
            this.showFieldError(input.id, 'Name must be at least 2 characters');
            return false;
        }
        this.clearFieldError(input.id);
        return true;
    }
    
    validateEmail(input) {
        const value = input.value.trim();
        if (!Utils.isValidEmail(value)) {
            this.showFieldError(input.id, 'Please enter a valid email address');
            return false;
        }
        this.clearFieldError(input.id);
        return true;
    }
    
    validatePhone(input) {
        const value = input.value.trim();
        if (!Utils.isValidPhone(value)) {
            this.showFieldError(input.id, 'Please enter a valid 10-digit phone number');
            return false;
        }
        this.clearFieldError(input.id);
        return true;
    }
    
    validateClientCode(input) {
        const value = input.value.trim().toUpperCase();
        input.value = value; // Auto-uppercase
        if (!Utils.isValidClientCode(value)) {
            this.showFieldError(input.id, 'Please enter a valid client code');
            return false;
        }
        this.clearFieldError(input.id);
        return true;
    }
    
    validatePassword(input) {
        const value = input.value;
        if (!Utils.isValidPassword(value)) {
            this.showFieldError(input.id, 'Password must be at least 6 characters');
            return false;
        }
        this.clearFieldError(input.id);
        return true;
    }
    
    /**
     * Show field error
     */
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        // Remove existing error
        this.clearFieldError(fieldId);
        
        // Add error class
        field.classList.add('error');
        
        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.id = `${fieldId}-error`;
        
        // Insert after field
        field.parentNode.insertBefore(errorDiv, field.nextSibling);
    }
    
    /**
     * Clear field error
     */
    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        const errorDiv = document.getElementById(`${fieldId}-error`);
        
        if (field) {
            field.classList.remove('error');
        }
        
        if (errorDiv) {
            errorDiv.remove();
        }
    }
    
    /**
     * Show form error
     */
    showFormError(message) {
        // Remove existing error
        this.clearFormErrors();
        
        // Create error div
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${Utils.sanitizeHtml(message)}</span>
        `;
        
        // Insert at top of active form
        const activeForm = document.querySelector('.auth-form:not(.hidden)');
        if (activeForm) {
            activeForm.insertBefore(errorDiv, activeForm.firstChild);
        }
    }
    
    /**
     * Clear form errors
     */
    clearFormErrors() {
        // Clear form-level errors
        document.querySelectorAll('.form-error').forEach(error => {
            error.remove();
        });
        
        // Clear field-level errors
        document.querySelectorAll('.field-error').forEach(error => {
            error.remove();
        });
        
        document.querySelectorAll('.error').forEach(field => {
            field.classList.remove('error');
        });
    }
    
    /**
     * Show SmartAPI error
     */
    showSmartApiError(message) {
        this.clearSmartApiErrors();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${Utils.sanitizeHtml(message)}</span>
        `;
        
        if (this.smartApiForm) {
            this.smartApiForm.insertBefore(errorDiv, this.smartApiForm.firstChild);
        }
    }
    
    /**
     * Clear SmartAPI errors
     */
    clearSmartApiErrors() {
        if (this.smartApiForm) {
            const errors = this.smartApiForm.querySelectorAll('.form-error');
            errors.forEach(error => error.remove());
        }
    }
    
    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isLoading = loading;
        
        // Update submit buttons
        const submitButtons = document.querySelectorAll('.auth-form button[type="submit"], .modal-form button[type="submit"]');
        
        submitButtons.forEach(btn => {
            if (loading) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            } else {
                btn.disabled = false;
                // Restore original text based on button context
                if (btn.closest('#loginForm')) {
                    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
                } else if (btn.closest('#registerForm')) {
                    btn.innerHTML = '<i class="fas fa-user-plus"></i> Register';
                } else if (btn.closest('#smartApiForm')) {
                    btn.innerHTML = '<i class="fas fa-link"></i> Connect';
                }
            }
        });
    }
}

// Create global Auth instance
window.Auth = new AuthManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
