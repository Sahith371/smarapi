// Portfolio Management Module

class PortfolioManager {
    constructor() {
        this.data = null;
        this.isLoading = false;
        this.charts = {};
        this.refreshInterval = null;
    }
    
    /**
     * Load portfolio data
     */
    async load() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.showLoadingState();
            
            const response = await API.getPortfolio();
            
            if (response.success) {
                this.data = response.data.portfolio;
                this.render();
            } else {
                this.showError(response.message || 'Failed to load portfolio');
            }
            
        } catch (error) {
            console.error('Portfolio load error:', error);
            this.showError(error.message || CONFIG.ERRORS.SERVER_ERROR);
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    }
    
    /**
     * Render portfolio section
     */
    render() {
        if (!this.data) return;
        
        const portfolioSection = document.getElementById('portfolioSection');
        if (!portfolioSection) return;
        
        portfolioSection.innerHTML = `
            <div class="section-header">
                <h2>Portfolio</h2>
                <div class="header-actions">
                    <button class="btn btn-outline" id="updatePricesBtn">
                        <i class="fas fa-refresh"></i>
                        Update Prices
                    </button>
                    <button class="btn btn-primary" id="syncPortfolioBtn">
                        <i class="fas fa-sync"></i>
                        Sync Portfolio
                    </button>
                </div>
            </div>
            
            <div class="portfolio-grid">
                <!-- Portfolio Summary -->
                <div class="card portfolio-overview">
                    <div class="card-header">
                        <h3>Portfolio Overview</h3>
                        <div class="sync-status">
                            <span class="sync-indicator ${this.data.syncStatus}"></span>
                            <span class="sync-text">
                                ${this.data.lastSyncAt ? 
                                    `Last synced: ${Utils.getRelativeTime(this.data.lastSyncAt)}` : 
                                    'Never synced'
                                }
                            </span>
                        </div>
                    </div>
                    <div class="card-content">
                        <div class="overview-stats">
                            <div class="stat-group">
                                <div class="stat-item">
                                    <div class="stat-label">Total Invested</div>
                                    <div class="stat-value">${Utils.formatCurrency(this.data.totalInvestedValue)}</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-label">Current Value</div>
                                    <div class="stat-value">${Utils.formatCurrency(this.data.totalCurrentValue)}</div>
                                </div>
                            </div>
                            <div class="stat-group">
                                <div class="stat-item">
                                    <div class="stat-label">Total P&L</div>
                                    <div class="stat-value ${Utils.getPnLClass(this.data.totalPnL)}">
                                        ${Utils.formatCurrency(this.data.totalPnL)}
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-label">P&L %</div>
                                    <div class="stat-value ${Utils.getPnLClass(this.data.totalPnL)}">
                                        ${Utils.formatPercentage(this.data.totalPnLPercentage)}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="portfolio-chart-container">
                            <canvas id="portfolioChart"></canvas>
                        </div>
                    </div>
                </div>
                
                <!-- Holdings Table -->
                <div class="card holdings-table">
                    <div class="card-header">
                        <h3>Holdings (${this.data.holdings.length})</h3>
                        <div class="table-actions">
                            <div class="search-input">
                                <i class="fas fa-search search-icon"></i>
                                <input type="text" id="holdingsSearch" placeholder="Search holdings...">
                            </div>
                            <select id="holdingsFilter" class="filter-select">
                                <option value="">All Exchanges</option>
                                <option value="NSE">NSE</option>
                                <option value="BSE">BSE</option>
                            </select>
                        </div>
                    </div>
                    <div class="card-content">
                        <div class="table-container">
                            <table class="data-table" id="holdingsTable">
                                <thead>
                                    <tr>
                                        <th>Symbol</th>
                                        <th>Exchange</th>
                                        <th class="text-right">Qty</th>
                                        <th class="text-right">Avg Price</th>
                                        <th class="text-right">LTP</th>
                                        <th class="text-right">Invested</th>
                                        <th class="text-right">Current</th>
                                        <th class="text-right">P&L</th>
                                        <th class="text-right">P&L %</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="holdingsTableBody">
                                    ${this.renderHoldingsRows()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
        this.renderPortfolioChart();
        this.setupSearch();
    }
    
    /**
     * Render holdings table rows
     */
    renderHoldingsRows() {
        if (!this.data.holdings || this.data.holdings.length === 0) {
            return `
                <tr>
                    <td colspan="10" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-briefcase"></i>
                            <p>No holdings found</p>
                            <button class="btn btn-primary" id="syncPortfolioEmpty">
                                <i class="fas fa-sync"></i>
                                Sync Portfolio
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        return this.data.holdings.map(holding => {
            const investedValue = holding.quantity * holding.averagePrice;
            const currentValue = holding.quantity * holding.currentPrice;
            const pnl = currentValue - investedValue;
            const pnlPercentage = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
            
            return `
                <tr class="holding-row" data-symbol="${holding.symbol}" data-exchange="${holding.exchange}">
                    <td>
                        <div class="symbol-info">
                            <span class="symbol-name">${holding.symbol}</span>
                        </div>
                    </td>
                    <td>
                        <span class="exchange-badge">${holding.exchange}</span>
                    </td>
                    <td class="text-right">${Utils.formatNumber(holding.quantity, 0)}</td>
                    <td class="text-right">${Utils.formatCurrency(holding.averagePrice)}</td>
                    <td class="text-right">
                        <span class="ltp-price">${Utils.formatCurrency(holding.currentPrice)}</span>
                        <div class="price-time">${Utils.getRelativeTime(holding.lastUpdated)}</div>
                    </td>
                    <td class="text-right">${Utils.formatCurrency(investedValue)}</td>
                    <td class="text-right">${Utils.formatCurrency(currentValue)}</td>
                    <td class="text-right ${Utils.getPnLClass(pnl)}">
                        ${Utils.formatCurrency(pnl)}
                    </td>
                    <td class="text-right ${Utils.getPnLClass(pnl)}">
                        ${Utils.formatPercentage(pnlPercentage)}
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-outline" onclick="Portfolio.viewHolding('${holding.symbol}', '${holding.exchange}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-success" onclick="Portfolio.sellHolding('${holding.symbol}', '${holding.exchange}')">
                                <i class="fas fa-minus"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Sync portfolio button
        const syncBtn = document.getElementById('syncPortfolioBtn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.syncPortfolio());
        }
        
        // Update prices button
        const updateBtn = document.getElementById('updatePricesBtn');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => this.updatePrices());
        }
        
        // Empty state sync button
        const syncEmptyBtn = document.getElementById('syncPortfolioEmpty');
        if (syncEmptyBtn) {
            syncEmptyBtn.addEventListener('click', () => this.syncPortfolio());
        }
    }
    
    /**
     * Setup search and filter functionality
     */
    setupSearch() {
        const searchInput = document.getElementById('holdingsSearch');
        const filterSelect = document.getElementById('holdingsFilter');
        
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(() => {
                this.filterHoldings();
            }, 300));
        }
        
        if (filterSelect) {
            filterSelect.addEventListener('change', () => {
                this.filterHoldings();
            });
        }
    }
    
    /**
     * Filter holdings based on search and filter criteria
     */
    filterHoldings() {
        const searchTerm = document.getElementById('holdingsSearch')?.value.toLowerCase() || '';
        const exchangeFilter = document.getElementById('holdingsFilter')?.value || '';
        
        const rows = document.querySelectorAll('.holding-row');
        
        rows.forEach(row => {
            const symbol = row.dataset.symbol.toLowerCase();
            const exchange = row.dataset.exchange;
            
            const matchesSearch = symbol.includes(searchTerm);
            const matchesFilter = !exchangeFilter || exchange === exchangeFilter;
            
            if (matchesSearch && matchesFilter) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
    
    /**
     * Render portfolio chart
     */
    renderPortfolioChart() {
        const canvas = document.getElementById('portfolioChart');
        if (!canvas || !this.data.holdings.length) return;
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (this.charts.portfolio) {
            this.charts.portfolio.destroy();
        }
        
        // Prepare data for pie chart
        const holdings = this.data.holdings.map(holding => ({
            label: holding.symbol,
            value: holding.quantity * holding.currentPrice,
            color: Utils.generateRandomColor()
        }));
        
        // Sort by value and take top 10
        holdings.sort((a, b) => b.value - a.value);
        const topHoldings = holdings.slice(0, 10);
        
        // Group remaining as "Others"
        if (holdings.length > 10) {
            const othersValue = holdings.slice(10).reduce((sum, h) => sum + h.value, 0);
            topHoldings.push({
                label: 'Others',
                value: othersValue,
                color: '#94a3b8'
            });
        }
        
        this.charts.portfolio = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: topHoldings.map(h => h.label),
                datasets: [{
                    data: topHoldings.map(h => h.value),
                    backgroundColor: topHoldings.map(h => h.color),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            generateLabels: (chart) => {
                                const data = chart.data;
                                return data.labels.map((label, i) => ({
                                    text: `${label} (${Utils.formatCurrency(data.datasets[0].data[i])})`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    strokeStyle: data.datasets[0].backgroundColor[i],
                                    pointStyle: 'circle'
                                }));
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${Utils.formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Sync portfolio with broker
     */
    async syncPortfolio() {
        const syncBtn = document.getElementById('syncPortfolioBtn');
        const syncEmptyBtn = document.getElementById('syncPortfolioEmpty');
        
        try {
            // Update button states
            [syncBtn, syncEmptyBtn].forEach(btn => {
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
                }
            });
            
            const response = await API.syncPortfolio();
            
            if (response.success) {
                Toast.show('Portfolio synced successfully', 'success');
                await this.load(); // Reload portfolio data
            } else {
                Toast.show(response.message || 'Sync failed', 'error');
            }
            
        } catch (error) {
            console.error('Portfolio sync error:', error);
            Toast.show(error.message || 'Sync failed', 'error');
        } finally {
            // Restore button states
            [syncBtn, syncEmptyBtn].forEach(btn => {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-sync"></i> Sync Portfolio';
                }
            });
        }
    }
    
    /**
     * Update current prices
     */
    async updatePrices() {
        const updateBtn = document.getElementById('updatePricesBtn');
        
        try {
            if (updateBtn) {
                updateBtn.disabled = true;
                updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            }
            
            const response = await API.updatePortfolioPrices();
            
            if (response.success) {
                Toast.show('Prices updated successfully', 'success');
                await this.load(); // Reload portfolio data
            } else {
                Toast.show(response.message || 'Price update failed', 'error');
            }
            
        } catch (error) {
            console.error('Price update error:', error);
            Toast.show(error.message || 'Price update failed', 'error');
        } finally {
            if (updateBtn) {
                updateBtn.disabled = false;
                updateBtn.innerHTML = '<i class="fas fa-refresh"></i> Update Prices';
            }
        }
    }
    
    /**
     * View holding details
     */
    async viewHolding(symbol, exchange) {
        try {
            const response = await API.get(`/api/portfolio/holding/${symbol}/${exchange}`);
            
            if (response.data.success) {
                this.showHoldingModal(response.data.data.holding);
            } else {
                Toast.show('Failed to load holding details', 'error');
            }
        } catch (error) {
            console.error('View holding error:', error);
            Toast.show('Failed to load holding details', 'error');
        }
    }
    
    /**
     * Show holding details modal
     */
    showHoldingModal(holding) {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${holding.symbol} - ${holding.exchange}</h3>
                    <button class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="holding-details">
                        <div class="detail-group">
                            <div class="detail-item">
                                <label>Quantity</label>
                                <span>${Utils.formatNumber(holding.quantity, 0)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Average Price</label>
                                <span>${Utils.formatCurrency(holding.averagePrice)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Current Price</label>
                                <span>${Utils.formatCurrency(holding.currentPrice)}</span>
                            </div>
                        </div>
                        <div class="detail-group">
                            <div class="detail-item">
                                <label>Invested Value</label>
                                <span>${Utils.formatCurrency(holding.investedValue)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Current Value</label>
                                <span>${Utils.formatCurrency(holding.currentValue)}</span>
                            </div>
                            <div class="detail-item">
                                <label>P&L</label>
                                <span class="${Utils.getPnLClass(holding.pnl)}">
                                    ${Utils.formatCurrency(holding.pnl)} (${Utils.formatPercentage(holding.pnlPercentage)})
                                </span>
                            </div>
                        </div>
                        <div class="detail-group">
                            <div class="detail-item">
                                <label>Last Updated</label>
                                <span>${Utils.formatDate(holding.lastUpdated)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-success" onclick="Portfolio.sellHolding('${holding.symbol}', '${holding.exchange}')">
                        <i class="fas fa-minus"></i>
                        Sell
                    </button>
                    <button class="btn btn-secondary modal-close">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal handlers
        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.remove();
            });
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    /**
     * Sell holding (navigate to orders)
     */
    sellHolding(symbol, exchange) {
        // Store sell order data for orders page
        Utils.sessionStorage.set('sellOrder', { symbol, exchange });
        window.App.navigateToSection('orders');
        Toast.show(`Sell order for ${symbol} prepared`, 'info');
    }
    
    /**
     * Show loading state
     */
    showLoadingState() {
        const portfolioSection = document.getElementById('portfolioSection');
        if (portfolioSection) {
            portfolioSection.innerHTML = `
                <div class="section-header">
                    <h2>Portfolio</h2>
                </div>
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Loading portfolio...</p>
                </div>
            `;
        }
    }
    
    /**
     * Hide loading state
     */
    hideLoadingState() {
        // Loading state is replaced by render()
    }
    
    /**
     * Show error state
     */
    showError(message) {
        const portfolioSection = document.getElementById('portfolioSection');
        if (portfolioSection) {
            portfolioSection.innerHTML = `
                <div class="section-header">
                    <h2>Portfolio</h2>
                </div>
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load portfolio</h3>
                    <p>${Utils.sanitizeHtml(message)}</p>
                    <button class="btn btn-primary" onclick="window.Portfolio.load()">
                        <i class="fas fa-refresh"></i>
                        Retry
                    </button>
                </div>
            `;
        }
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });
        this.charts = {};
    }
}

// Create global Portfolio instance
window.Portfolio = new PortfolioManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PortfolioManager;
}
