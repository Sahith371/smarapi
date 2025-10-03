const axios = require('axios');
const crypto = require('crypto');
const qs = require('querystring');

class SmartApiService {
  constructor() {
    this.baseURL = process.env.SMART_API_BASE_URL || 'https://apiconnect.angelbroking.com';
    this.apiKey = process.env.SMART_API_KEY;
    this.apiSecret = process.env.SMART_API_SECRET;
    this.clientCode = process.env.SMART_API_CLIENT_CODE;
    this.redirectUrl = process.env.SMART_API_REDIRECT_URL;
  }

  // Generate session token
  async generateSession(clientCode, password, totp) {
    try {
      const response = await axios.post(`${this.baseURL}/rest/auth/angelbroking/user/v1/loginByPassword`, {
        clientcode: clientCode,
        password: password,
        totp: totp
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': '106.193.147.98',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': this.apiKey
        }
      });

      if (response.data.status && response.data.data) {
        return {
          success: true,
          data: {
            jwtToken: response.data.data.jwtToken,
            refreshToken: response.data.data.refreshToken,
            feedToken: response.data.data.feedToken
          }
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Login failed'
        };
      }
    } catch (error) {
      console.error('SmartAPI login error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    try {
      const response = await axios.post(`${this.baseURL}/rest/auth/angelbroking/jwt/v1/generateTokens`, {
        refreshToken: refreshToken
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': '106.193.147.98',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': this.apiKey
        }
      });

      if (response.data.status && response.data.data) {
        return {
          success: true,
          data: {
            jwtToken: response.data.data.jwtToken,
            refreshToken: response.data.data.refreshToken,
            feedToken: response.data.data.feedToken
          }
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Token refresh failed'
        };
      }
    } catch (error) {
      console.error('Token refresh error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Token refresh failed'
      };
    }
  }

  // Get user profile
  async getUserProfile(jwtToken) {
    try {
      const response = await axios.get(`${this.baseURL}/rest/secure/angelbroking/user/v1/getProfile`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': '106.193.147.98',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': this.apiKey
        }
      });

      return {
        success: response.data.status,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get profile error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to fetch profile'
      };
    }
  }

  // Get holdings
  async getHoldings(jwtToken) {
    try {
      const response = await axios.get(`${this.baseURL}/rest/secure/angelbroking/portfolio/v1/getHolding`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': '106.193.147.98',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': this.apiKey
        }
      });

      return {
        success: response.data.status,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get holdings error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to fetch holdings'
      };
    }
  }

  // Get positions
  async getPositions(jwtToken) {
    try {
      const response = await axios.get(`${this.baseURL}/rest/secure/angelbroking/order/v1/getPosition`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': '106.193.147.98',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': this.apiKey
        }
      });

      return {
        success: response.data.status,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get positions error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to fetch positions'
      };
    }
  }

  // Place order
  async placeOrder(jwtToken, orderData) {
    try {
      const response = await axios.post(`${this.baseURL}/rest/secure/angelbroking/order/v1/placeOrder`, orderData, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': '106.193.147.98',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': this.apiKey
        }
      });

      return {
        success: response.data.status,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Place order error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to place order'
      };
    }
  }

  // Modify order
  async modifyOrder(jwtToken, orderData) {
    try {
      const response = await axios.post(`${this.baseURL}/rest/secure/angelbroking/order/v1/modifyOrder`, orderData, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': '106.193.147.98',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': this.apiKey
        }
      });

      return {
        success: response.data.status,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Modify order error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to modify order'
      };
    }
  }

  // Cancel order
  async cancelOrder(jwtToken, variety, orderId) {
    try {
      const response = await axios.post(`${this.baseURL}/rest/secure/angelbroking/order/v1/cancelOrder`, {
        variety: variety,
        orderid: orderId
      }, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': '106.193.147.98',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': this.apiKey
        }
      });

      return {
        success: response.data.status,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Cancel order error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to cancel order'
      };
    }
  }

  // Get order book
  async getOrderBook(jwtToken) {
    try {
      const response = await axios.get(`${this.baseURL}/rest/secure/angelbroking/order/v1/getOrderBook`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': '106.193.147.98',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': this.apiKey
        }
      });

      return {
        success: response.data.status,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get order book error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to fetch order book'
      };
    }
  }

  // Get LTP (Last Traded Price)
  async getLTP(jwtToken, exchange, tradingSymbol, symbolToken) {
    try {
      const response = await axios.post(`${this.baseURL}/rest/secure/angelbroking/order/v1/getLtpData`, {
        exchange: exchange,
        tradingsymbol: tradingSymbol,
        symboltoken: symbolToken
      }, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': '106.193.147.98',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': this.apiKey
        }
      });

      return {
        success: response.data.status,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get LTP error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to fetch LTP'
      };
    }
  }

  // Get historical data
  async getHistoricalData(jwtToken, exchange, symbolToken, interval, fromDate, toDate) {
    try {
      const response = await axios.post(`${this.baseURL}/rest/secure/angelbroking/historical/v1/getCandleData`, {
        exchange: exchange,
        symboltoken: symbolToken,
        interval: interval,
        fromdate: fromDate,
        todate: toDate
      }, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': '106.193.147.98',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': this.apiKey
        }
      });

      return {
        success: response.data.status,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get historical data error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to fetch historical data'
      };
    }
  }

  // Search instruments
  async searchInstruments(jwtToken, exchange, searchText) {
    try {
      const response = await axios.post(`${this.baseURL}/rest/secure/angelbroking/order/v1/searchScrip`, {
        exchange: exchange,
        searchscrip: searchText
      }, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': '106.193.147.98',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': this.apiKey
        }
      });

      return {
        success: response.data.status,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Search instruments error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to search instruments'
      };
    }
  }

  // Logout
  async logout(jwtToken) {
    try {
      const response = await axios.post(`${this.baseURL}/rest/secure/angelbroking/user/v1/logout`, {
        clientcode: this.clientCode
      }, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': '106.193.147.98',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': this.apiKey
        }
      });

      return {
        success: response.data.status,
        message: response.data.message
      };
    } catch (error) {
      console.error('Logout error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Logout failed'
      };
    }

  // Handle OAuth callback and exchange authorization code for tokens
  async handleOAuthCallback(authCode) {
    try {
      const tokenUrl = `${this.baseURL}/rest/auth/angelbroking/jwt/v1/generateTokens`;
      // Prepare the request payload
      const payload = {
        clientcode: this.clientCode,
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: this.redirectUrl
      };

      // Generate authorization header
      const authString = `${this.apiKey}:${this.apiSecret}`;
      const authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;

      const response = await axios.post(tokenUrl, qs.stringify(payload), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': authHeader,
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB'
        }
      });

      if (response.data && response.data.data) {
        return {
          success: true,
          data: {
            jwtToken: response.data.data.jwtToken,
            refreshToken: response.data.data.refreshToken,
            feedToken: response.data.data.feedToken,
            clientCode: this.clientCode
          }
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Failed to get access token'
        };
      }
    } catch (error) {
      console.error('OAuth callback error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to process OAuth callback',
        error: error.message
      };
    }
  }
}

module.exports = new SmartApiService();
