const express = require('express');
const UserToken = require('../models/UserToken');
const metaApi = require('../services/metaApi');
const router = express.Router();

/**
 * Middleware to validate userId and get access token
 */
const validateUserAndToken = async (req, res, next) => {
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
      return res.status(401).json({
        success: false,
        error: 'User not authenticated. Please complete OAuth flow first.'
      });
    }

    if (userToken.isExpired()) {
      return res.status(401).json({
        success: false,
        error: 'Access token expired. Please re-authenticate.',
        expired: true
      });
    }

    // Attach token info to request
    req.userToken = userToken;
    req.accessToken = userToken.accessToken;
    req.adAccountId = userToken.adAccountId || req.query.adAccountId;

    next();
  } catch (error) {
    console.error('Error validating user token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate authentication'
    });
  }
};

/**
 * Get user's ad campaigns
 * GET /meta/campaigns?userId=USER_ID&adAccountId=ACT_123&limit=25
 */
router.get('/campaigns', validateUserAndToken, async (req, res) => {
  try {
    const { limit, fields } = req.query;
    const adAccountId = req.adAccountId;

    if (!adAccountId) {
      return res.status(400).json({
        success: false,
        error: 'adAccountId is required. Provide it in query params or complete OAuth to auto-detect.'
      });
    }

    const campaigns = await metaApi.getCampaigns(req.accessToken, adAccountId, {
      limit: limit || 25,
      fields: fields
    });

    res.json({
      success: true,
      data: campaigns.data || campaigns,
      paging: campaigns.paging
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch campaigns'
    });
  }
});

/**
 * Get spend/insights data
 * GET /meta/spend?userId=USER_ID&adAccountId=ACT_123&datePreset=last_30d&level=campaign
 */
router.get('/spend', validateUserAndToken, async (req, res) => {
  try {
    const { datePreset, level, timeRange, limit } = req.query;
    const adAccountId = req.adAccountId;

    if (!adAccountId) {
      return res.status(400).json({
        success: false,
        error: 'adAccountId is required'
      });
    }

    const params = {
      datePreset: datePreset || 'last_30d',
      level: level || 'campaign',
      limit: limit || 25
    };

    // Parse timeRange if provided as JSON string
    if (timeRange) {
      try {
        params.timeRange = JSON.parse(timeRange);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid timeRange format. Expected JSON string like: {"since":"2024-01-01","until":"2024-01-31"}'
        });
      }
    }

    const spend = await metaApi.getSpend(req.accessToken, adAccountId, params);

    res.json({
      success: true,
      data: spend.data || spend,
      paging: spend.paging
    });
  } catch (error) {
    console.error('Error fetching spend data:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch spend data'
    });
  }
});

/**
 * Get leads
 * GET /meta/leads?userId=USER_ID&adAccountId=ACT_123&limit=25
 */
router.get('/leads', validateUserAndToken, async (req, res) => {
  try {
    const { limit } = req.query;
    const adAccountId = req.adAccountId;

    if (!adAccountId) {
      return res.status(400).json({
        success: false,
        error: 'adAccountId is required'
      });
    }

    const leads = await metaApi.getLeads(req.accessToken, adAccountId, {
      limit: limit || 25
    });

    res.json({
      success: true,
      data: leads.data || leads,
      paging: leads.paging
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch leads'
    });
  }
});

/**
 * Get ad sets
 * GET /meta/adsets?userId=USER_ID&adAccountId=ACT_123&campaignId=CAMPAIGN_ID&limit=25
 */
router.get('/adsets', validateUserAndToken, async (req, res) => {
  try {
    const { campaignId, limit, fields } = req.query;
    const adAccountId = req.adAccountId;

    if (!adAccountId) {
      return res.status(400).json({
        success: false,
        error: 'adAccountId is required'
      });
    }

    const adSets = await metaApi.getAdSets(req.accessToken, adAccountId, campaignId, {
      limit: limit || 25,
      fields: fields
    });

    res.json({
      success: true,
      data: adSets.data || adSets,
      paging: adSets.paging
    });
  } catch (error) {
    console.error('Error fetching ad sets:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch ad sets'
    });
  }
});

/**
 * Get ad accounts for user
 * GET /meta/accounts?userId=USER_ID
 */
router.get('/accounts', validateUserAndToken, async (req, res) => {
  try {
    const accounts = await metaApi.getAdAccounts(req.accessToken);

    res.json({
      success: true,
      data: accounts.data || accounts,
      paging: accounts.paging
    });
  } catch (error) {
    console.error('Error fetching ad accounts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch ad accounts'
    });
  }
});

module.exports = router;

