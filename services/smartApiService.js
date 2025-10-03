const axios = require('axios');

class SmartAPI {
  constructor(apiKey, clientCode, clientSecret) {
    this.apiKey = apiKey;
    this.clientCode = clientCode;
    this.clientSecret = clientSecret;
    this.baseURL = 'https://apiconnect.angelbroking.com';
  }

  // Login with password + TOTP
  async login(password, totp) {
    try {
      const response = await axios.post(
        `${this.baseURL}/rest/auth/angelbroking/user/v1/loginByPassword`,
        {
          clientcode: this.clientCode,
          password: password,
          totp: totp,
        },
        {
          headers: {
            'X-PrivateKey': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: response.data.status,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Login failed',
      };
    }
  }

  // Generate Session (OAuth password grant)
  async generateSession(password, totp) {
    try {
      const response = await axios.post(
        `${this.baseURL}/rest/auth/angelbroking/user/v1/generateSession`,
        {
          clientcode: this.clientCode,
          password: password,
          totp: totp,
        },
        {
          headers: {
            'X-PrivateKey': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: response.data.status,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      console.error('GenerateSession error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Session generation failed',
      };
    }
  }

  // Logout
  async logout(jwtToken) {
    try {
      const response = await axios.post(
        `${this.baseURL}/rest/secure/angelbroking/user/v1/logout`,
        {
          clientcode: this.clientCode,
        },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-UserType': 'USER',
            'X-SourceID': 'WEB',
            'X-ClientLocalIP': '192.168.1.1',
            'X-ClientPublicIP': '106.193.147.98',
            'X-MACAddress': '00:00:00:00:00:00',
            'X-PrivateKey': this.apiKey,
          },
        }
      );

      return {
        success: response.data.status,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Logout error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Logout failed',
      };
    }
  }

  // Handle OAuth Callback (if using OAuth2 flow)
  async handleOAuthCallback(code, redirectUri) {
    try {
      const response = await axios.post(
        `${this.baseURL}/oauth/token`,
        {
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
          client_id: this.apiKey,
          client_secret: this.clientSecret,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        tokens: response.data,
      };
    } catch (error) {
      console.error('OAuth callback error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'OAuth callback failed',
      };
    }
  }
}

module.exports = SmartAPI;
