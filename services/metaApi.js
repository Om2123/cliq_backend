const axios = require('axios');

const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

/**
 * Make a request to Meta Graph API
 * @param {string} accessToken - User's access token
 * @param {string} endpoint - API endpoint (e.g., '/me/adaccounts')
 * @param {object} params - Query parameters
 * @returns {Promise} API response
 */
const makeGraphApiRequest = async (accessToken, endpoint, params = {}) => {
  try {
    const url = `${GRAPH_API_BASE}${endpoint}`;
    const response = await axios.get(url, {
      params: {
        access_token: accessToken,
        ...params
      }
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`Meta API Error: ${error.response.data.error?.message || error.message}`);
    }
    throw error;
  }
};

/**
 * Get user's ad accounts
 * @param {string} accessToken - User's access token
 * @returns {Promise} List of ad accounts
 */
const getAdAccounts = async (accessToken) => {
  return makeGraphApiRequest(accessToken, '/me/adaccounts', {
    fields: 'id,name,account_id,currency,timezone_name'
  });
};

/**
 * Get campaigns for an ad account
 * @param {string} accessToken - User's access token
 * @param {string} adAccountId - Ad account ID (format: act_123456789)
 * @param {object} params - Additional parameters (limit, fields, etc.)
 * @returns {Promise} List of campaigns
 */
const getCampaigns = async (accessToken, adAccountId, params = {}) => {
  const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  return makeGraphApiRequest(accessToken, `/${accountId}/campaigns`, {
    fields: 'id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time',
    limit: params.limit || 25,
    ...params
  });
};

/**
 * Get ad sets for an ad account or campaign
 * @param {string} accessToken - User's access token
 * @param {string} adAccountId - Ad account ID
 * @param {string} campaignId - Optional campaign ID to filter ad sets
 * @param {object} params - Additional parameters
 * @returns {Promise} List of ad sets
 */
const getAdSets = async (accessToken, adAccountId, campaignId = null, params = {}) => {
  const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const endpoint = campaignId 
    ? `/${campaignId}/adsets`
    : `/${accountId}/adsets`;
  
  return makeGraphApiRequest(accessToken, endpoint, {
    fields: 'id,name,status,campaign_id,daily_budget,lifetime_budget,billing_event,optimization_goal,created_time',
    limit: params.limit || 25,
    ...params
  });
};

/**
 * Get spend/insights for campaigns
 * @param {string} accessToken - User's access token
 * @param {string} adAccountId - Ad account ID
 * @param {object} params - Date range, level, etc.
 * @returns {Promise} Insights data
 */
const getSpend = async (accessToken, adAccountId, params = {}) => {
  const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const datePreset = params.datePreset || 'last_30d';
  const level = params.level || 'campaign';
  
  return makeGraphApiRequest(accessToken, `/${accountId}/insights`, {
    level: level,
    date_preset: datePreset,
    fields: 'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,cpp,cpm,reach,frequency,actions',
    time_range: params.timeRange ? JSON.stringify(params.timeRange) : undefined,
    limit: params.limit || 25,
    ...params
  });
};

/**
 * Get leads for an ad account
 * @param {string} accessToken - User's access token
 * @param {string} adAccountId - Ad account ID
 * @param {object} params - Additional parameters
 * @returns {Promise} List of leads
 */
const getLeads = async (accessToken, adAccountId, params = {}) => {
  const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  
  // Get leadgen forms first
  const formsResponse = await makeGraphApiRequest(accessToken, `/${accountId}/leadgen_forms`, {
    fields: 'id,name,status',
    limit: params.limit || 25
  });
  
  // For each form, get leads (this is a simplified approach)
  // In production, you might want to paginate and aggregate
  const leads = [];
  
  if (formsResponse.data && formsResponse.data.length > 0) {
    for (const form of formsResponse.data.slice(0, 5)) { // Limit to 5 forms for demo
      try {
        const formLeads = await makeGraphApiRequest(accessToken, `/${form.id}/leads`, {
          fields: 'id,created_time,field_data',
          limit: 10
        });
        
        if (formLeads.data) {
          leads.push(...formLeads.data.map(lead => ({
            ...lead,
            form_id: form.id,
            form_name: form.name
          })));
        }
      } catch (error) {
        console.error(`Error fetching leads for form ${form.id}:`, error.message);
      }
    }
  }
  
  return {
    data: leads,
    paging: formsResponse.paging
  };
};

module.exports = {
  makeGraphApiRequest,
  getAdAccounts,
  getCampaigns,
  getAdSets,
  getSpend,
  getLeads
};

