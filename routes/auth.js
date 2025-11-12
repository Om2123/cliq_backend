const express = require('express');
const axios = require('axios');
const UserToken = require('../models/UserToken');
const router = express.Router();

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_REDIRECT_URI = process.env.META_REDIRECT_URI;

/**
 * Generate OAuth URL and redirect user to Meta login
 * GET /auth/start?userId=USER_ID
 */
router.get('/start', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    if (!META_APP_ID || !META_APP_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'Meta OAuth credentials not configured'
      });
    }

    // Generate state parameter for security (store userId in state)
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

    // Required permissions for Meta Ads API
    const scope = [
      'ads_read',
      'ads_management',
      'business_management',
      'leads_retrieval'
    ].join(',');

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${META_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}` +
      `&scope=${scope}` +
      `&state=${state}` +
      `&response_type=code`;

    res.json({
      success: true,
      authUrl: authUrl,
      message: 'Redirect user to this URL to authenticate'
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authentication URL'
    });
  }
});

/**
 * Handle OAuth callback from Meta
 * GET /auth/callback?code=CODE&state=STATE
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: `OAuth error: ${error}`
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing code or state parameter'
      });
    }

    // Decode state to get userId
    let userId;
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = decodedState.userId;
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'Invalid state parameter'
      });
    }

    // Exchange code for access token
    const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
    const tokenParams = {
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      redirect_uri: META_REDIRECT_URI,
      code: code
    };

    const tokenResponse = await axios.get(tokenUrl, { params: tokenParams });

    if (!tokenResponse.data.access_token) {
      return res.status(400).json({
        success: false,
        error: 'Failed to obtain access token'
      });
    }

    const { access_token, expires_in, token_type } = tokenResponse.data;

    // Calculate expiration date
    const expiresAt = expires_in 
      ? new Date(Date.now() + expires_in * 1000)
      : null;

    // Get long-lived token (optional, but recommended)
    let longLivedToken = access_token;
    let longLivedExpiresAt = expiresAt;

    try {
      const longLivedUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
      const longLivedParams = {
        grant_type: 'fb_exchange_token',
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        fb_exchange_token: access_token
      };

      const longLivedResponse = await axios.get(longLivedUrl, { params: longLivedParams });
      
      if (longLivedResponse.data.access_token) {
        longLivedToken = longLivedResponse.data.access_token;
        const longLivedExpiresIn = longLivedResponse.data.expires_in || 5184000; // 60 days default
        longLivedExpiresAt = new Date(Date.now() + longLivedExpiresIn * 1000);
      }
    } catch (error) {
      console.warn('Failed to exchange for long-lived token:', error.message);
      // Continue with short-lived token
    }

    // Get user's ad account (optional, for convenience)
    let adAccountId = null;
    try {
      const accountsResponse = await axios.get('https://graph.facebook.com/v18.0/me/adaccounts', {
        params: {
          access_token: longLivedToken,
          fields: 'id,account_id',
          limit: 1
        }
      });
      
      if (accountsResponse.data.data && accountsResponse.data.data.length > 0) {
        adAccountId = accountsResponse.data.data[0].id;
      }
    } catch (error) {
      console.warn('Failed to fetch ad account:', error.message);
    }

    // Save or update token in database
    const tokenData = {
      userId: userId,
      accessToken: longLivedToken,
      expiresAt: longLivedExpiresAt,
      tokenType: token_type || 'Bearer',
      adAccountId: adAccountId
    };

    await UserToken.findOneAndUpdate(
      { userId: userId },
      tokenData,
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Authentication successful',
      userId: userId,
      expiresAt: longLivedExpiresAt
    });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || 'Authentication failed'
    });
  }
});

/**
 * Check authentication status for a user
 * GET /auth/status?userId=USER_ID
 */
router.get('/status', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const userToken = await UserToken.findOne({ userId });

    if (!userToken) {
      return res.json({
        success: false,
        authenticated: false,
        message: 'User not authenticated'
      });
    }

    const isExpired = userToken.isExpired();

    res.json({
      success: true,
      authenticated: !isExpired,
      expired: isExpired,
      expiresAt: userToken.expiresAt,
      adAccountId: userToken.adAccountId
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check authentication status'
    });
  }
});

module.exports = router;

