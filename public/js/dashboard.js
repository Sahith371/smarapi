// Dashboard Module

class DashboardManager {
    constructor() {
        this.data = null;
        this.isLoading = false;
        this.refreshInterval = null;

        // Chart instances
        this.charts = {};
    }

    /**
     * Load dashboard data
     */
    async load() {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            this.showLoadingState();

            const response = await API.getDashboard();

            if (response.success) {
                this.data = response.data.dashboard;
                this.render();
            } else {
                this.showError(response.message || 'Failed to load dashboard');
            }

        } catch (error) {
            console.error('Dashboard load error:', error);
            this.showError(error.message || CONFIG.ERRORS.SERVER_ERROR);
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    }

    /**
     * Render dashboard
     */
    render() {
        if (!this.data) return;

        this.renderPortfolioSummary();
        this.renderMarketStatus();
        this.renderRecentOrders();
        this.renderTopPerformers();
        this.renderQuickActions();
        this.renderAlerts();
    }

    renderPortfolioSummary() {
        const portfolio = this.data.portfolio || {};

        const totalValueEl = document.getElementById('totalValue');
        if (totalValueEl) {
            totalValueEl.textContent = Utils.formatCurrency(portfolio.totalCurrentValue);
            totalValueEl.className = `stat-value ${Utils.getPnLClass(portfolio.totalPnL)}`;
        }

        const totalPnLEl = document.getElementById('totalPnL');
        if (totalPnLEl) {
            const pnlText = `${Utils.formatCurrency(portfolio.totalPnL)} (${Utils.formatPercentage(portfolio.totalPnLPercentage)})`;
            totalPnLEl.textContent = pnlText;
            totalPnLEl.className = `stat-value ${Utils.getPnLClass(portfolio.totalPnL)}`;
        }

        const totalHoldingsEl = document.getElementById('totalHoldings');
        if (totalHoldingsEl) {
            totalHoldingsEl.textContent = portfolio.holdingsCount || 0;
        }

        this.updateSyncButton(portfolio.lastSyncAt);
    }

    async renderMarketStatus() {
        try {
            const response = await API.getMarketStatus();

            if (response.success) {
                const marketData = response.data;

                const statusEl = document.getElementById('marketStatus');
                const timeEl = document.getElementById('marketTime');

                if (statusEl) {
                    const statusDot = statusEl.querySelector('.status-dot');
                    const statusText = statusEl.querySelector('.status-text');

                    if (statusDot && statusText) {
                        statusDot.className = `status-dot ${marketData.status.toLowerCase()}`;
                        statusText.textContent = marketData.status;
                    }
                }

                if (timeEl) {
                    timeEl.textContent = marketData.currentTime;
                }
            }
        } catch (error) {
            console.error('Market status error:', error);
        }
    }

    renderRecentOrders() {
        const orders = this.data.orders?.recent || [];
        const container = document.getElementById('recentOrdersList');

        if (!container) return;

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No recent orders</p>
                </div>
            `;
            return;
        }

        const ordersHtml = orders.map(order => `
            <div class="order-item">
                <div class="order-info">
                    <div class="order-symbol">${order.symbol}</div>
                    <div class="order-details">
                        ${order.transactionType} • ${order.orderType} • ${order.quantity} shares
                    </div>
                </div>
                <div class="order-status">
                    <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span>
                    <div class="order-time">${Utils.getRelativeTime(order.orderTime)}</div>
                </div>
            </div>
        `).join('');

        container.innerHTML = ordersHtml;
    }

    renderTopPerformers() {
        const performers = this.data.topPerformers;
        const container = document.getElementById('topPerformersList');

        if (!container) return;

        if (!performers || (!performers.topGainers.length && !performers.topLosers.length)) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <p>No holdings data</p>
                </div>
            `;
            return;
        }

        let performersHtml = '';

        // Top gainers
        if (performers.topGainers.length > 0) {
            performersHtml += '<div class="performers-section"><h4>Top Gainers</h4>';
            performers.topGainers.slice(0, 3).forEach(stock => {
                performersHtml += `
                    <div class="performer-item">
                        <div class="performer-info">
                            <div class="performer-symbol">${stock.symbol}</div>
                            <div class="performer-exchange">${stock.exchange}</div>
                        </div>
                        <div class="performer-pnl text-success">
                            +${Utils.formatPercentage(stock.pnlPercentage)}
                        </div>
                    </div>
                `;
            });
            performersHtml += '</div>';
        }

        // Top losers
        if (performers.topLosers.length > 0) {
            performersHtml += '<div class="performers-section"><h4>Top Losers</h4>';
            performers.topLosers.slice(0, 3).forEach(stock => {
                performersHtml += `
                    <div class="performer-item">
                        <div class="performer-info">
                            <div class="performer-symbol">${stock.symbol}</div>
                            <div class="performer-exchange">${stock.exchange}</div>
                        </div>
                        <div class="performer-pnl text-danger">
                            ${Utils.formatPercentage(stock.pnlPercentage)}
                        </div>
                    </div>
                `;
            });
            performersHtml += '</div>';
        }

        container.innerHTML = performersHtml;
    }

    renderQuickActions() {
        const actionButtons = document.querySelectorAll('.action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleQuickAction(action);
            });
        });
    }

    handleQuickAction(action) {
        switch (action) {
            case 'buy':
                this.showOrderModal('BUY');
                break;
            case 'sell':
                this.showOrderModal('SELL');
                break;
            case 'watchlist':
                window.App.navigateToSection('watchlist');
                break;
            case 'orders':
                window.App.navigateToSection('orders');
                break;
        }
    }

    showOrderModal(transactionType) {
        window.App.navigateToSection('orders');
        Toast.show(`${transactionType} order form coming soon!`, 'info');
    }

    renderAlerts() {
        const alerts = this.data.alerts || {};
        const alertsContainer = this.createAlertsContainer();

        alertsContainer.innerHTML = '';

        if (alerts.portfolioSync) {
            this.showAlert(
                'Portfolio sync required',
                'Your portfolio data is outdated. Click sync to update.',
                'warning',
                () => this.syncPortfolio()
            );
        }

        if (alerts.smartApiConnection) {
            this.showAlert(
                'SmartAPI connection required',
                'Connect to Angel One to access trading features.',
                'info',
                () => window.Auth.showSmartApiModal()
            );
        }
    }

    createAlertsContainer() {
        let container = document.getElementById('dashboardAlerts');
        if (!container) {
            container = document.createElement('div');
            container.id = 'dashboardAlerts';
            container.className = 'dashboard-alerts';
            const dashboardGrid = document.querySelector('.dashboard-grid');
            if (dashboardGrid) {
                dashboardGrid.insertBefore(container, dashboardGrid.firstChild);
            }
        }
        return container;
    }

    showAlert(title, message, type, action) {
        const alertsContainer = this.createAlertsContainer();

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <div class="alert-content">
                <div class="alert-title">${Utils.sanitizeHtml(title)}</div>
                <div class="alert-message">${Utils.sanitizeHtml(message)}</div>
            </div>
            <div class="alert-actions">
                ${action ? '<button class="btn btn-sm btn-primary alert-action">Action</button>' : ''}
                <button class="btn btn-sm btn-outline alert-dismiss">Dismiss</button>
            </div>
        `;

        const actionBtn = alertDiv.querySelector('.alert-action');
        const dismissBtn = alertDiv.querySelector('.alert-dismiss');

        if (actionBtn && action) {
            actionBtn.addEventListener('click', () => {
                action();
                alertDiv.remove();
            });
        }

        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                alertDiv.remove();
            });
        }

        alertsContainer.appendChild(alertDiv);
    }

    updateSyncButton(lastSyncAt) {
        const syncBtn = document.getElementById('syncPortfolio');
        if (!syncBtn) return;

        if (lastSyncAt) {
            const syncTime = new Date(lastSyncAt);
            const now = new Date();
            const diffHours = (now - syncTime) / (1000 * 60 * 60);

            if (diffHours > 24) {
                syncBtn.classList.add('btn-warning');
                syncBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Sync Required';
            } else {
                syncBtn.classList.remove('btn-warning');
                syncBtn.innerHTML = '<i class="fas fa-sync"></i> Sync';
            }
        }

        syncBtn.addEventListener('click', () => this.syncPortfolio());
    }

    async syncPortfolio() {
        const syncBtn = document.getElementById('syncPortfolio');
        try {
            if (syncBtn) {
                syncBtn.disabled = true;
                syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
            }

            const response = await API.syncPortfolio();

            if (response.success) {
                Toast.show('Portfolio synced successfully', 'success');
                await this.load();
            } else {
                Toast.show(response.message || 'Sync failed', 'error');
            }

        } catch (error) {
            console.error('Portfolio sync error:', error);
            Toast.show(error.message || 'Sync failed', 'error');
        } finally {
            if (syncBtn) {
                syncBtn.disabled = false;
                syncBtn.innerHTML = '<i class="fas fa-sync"></i> Sync';
            }
        }
    }

    setupRefresh() {
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.load());
        }
    }

    showLoadingState() {
        document.querySelectorAll('.dashboard-grid .card').forEach(card => {
            card.classList.add('loading');
        });
    }

    hideLoadingState() {
        document.querySelectorAll('.dashboard-grid .card').forEach(card => {
            card.classList.remove('loading');
        });
    }

    showError(message) {
        const dashboardGrid = document.querySelector('.dashboard-grid');
        if (dashboardGrid) {
            dashboardGrid.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load dashboard</h3>
                    <p>${Utils.sanitizeHtml(message)}</p>
                    <button class="btn btn-primary" onclick="window.Dashboard.load()">
                        <i class="fas fa-refresh"></i>
                        Retry
                    </button>
                </div>
            `;
        }
    }

    init() {
        this.setupRefresh();
        this.load();
    }

    cleanup() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);

        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) chart.destroy();
        });
        this.charts = {};
    }
}

// Create global Dashboard instance
window.Dashboard = new DashboardManager();

document.addEventListener('DOMContentLoaded', () => {
    if (window.Dashboard) window.Dashboard.init();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardManager;
}
