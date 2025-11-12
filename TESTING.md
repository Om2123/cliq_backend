# Testing Guide

This guide helps you test the Zoho Cliq + Meta Ads backend API.

## Quick Start Testing

### 1. Start the Server

```bash
npm install
npm start
# or
npm run dev
```

### 2. Test Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-20T10:00:00.000Z"
}
```

### 3. Test OAuth Flow

#### Step 1: Get Auth URL

```bash
curl "http://localhost:3000/auth/start?userId=test_user_123"
```

Response will include `authUrl`. Copy this URL and open it in a browser.

#### Step 2: Complete OAuth

After authenticating on Facebook, you'll be redirected to `/auth/callback` with a code. The token will be automatically stored.

#### Step 3: Check Auth Status

```bash
curl "http://localhost:3000/auth/status?userId=test_user_123"
```

### 4. Test Meta API Endpoints

**Note:** You need to be authenticated first (complete OAuth flow).

#### Get Ad Accounts

```bash
curl "http://localhost:3000/meta/accounts?userId=test_user_123"
```

#### Get Campaigns

```bash
curl "http://localhost:3000/meta/campaigns?userId=test_user_123&adAccountId=act_123456789"
```

#### Get Spend Data

```bash
curl "http://localhost:3000/meta/spend?userId=test_user_123&adAccountId=act_123456789&datePreset=last_30d"
```

#### Get Leads

```bash
curl "http://localhost:3000/meta/leads?userId=test_user_123&adAccountId=act_123456789"
```

#### Get Ad Sets

```bash
curl "http://localhost:3000/meta/adsets?userId=test_user_123&adAccountId=act_123456789"
```

## Using Postman

1. Import the following collection or create requests manually:

### Collection Structure

**Base URL:** `http://localhost:3000`

#### Auth Endpoints

1. **Start OAuth**
   - Method: GET
   - URL: `/auth/start?userId={{userId}}`
   - Response: Copy `authUrl` and open in browser

2. **Check Status**
   - Method: GET
   - URL: `/auth/status?userId={{userId}}`

#### Meta Endpoints

All require `userId` and `adAccountId` (except `/meta/accounts`):

1. **Get Accounts**
   - Method: GET
   - URL: `/meta/accounts?userId={{userId}}`

2. **Get Campaigns**
   - Method: GET
   - URL: `/meta/campaigns?userId={{userId}}&adAccountId={{adAccountId}}`

3. **Get Spend**
   - Method: GET
   - URL: `/meta/spend?userId={{userId}}&adAccountId={{adAccountId}}&datePreset=last_30d`

4. **Get Leads**
   - Method: GET
   - URL: `/meta/leads?userId={{userId}}&adAccountId={{adAccountId}}`

5. **Get Ad Sets**
   - Method: GET
   - URL: `/meta/adsets?userId={{userId}}&adAccountId={{adAccountId}}`

## Testing with Mock Data

If you don't have a Meta ad account, you can:

1. Create a test Meta app in Facebook Developers
2. Use Meta's test mode
3. Mock the API responses in `services/metaApi.js` for development

## Common Issues

### "User not authenticated"
- Make sure you completed the OAuth flow
- Check `/auth/status` to verify authentication

### "adAccountId is required"
- Get ad accounts first: `/meta/accounts?userId=USER_ID`
- Use one of the returned account IDs

### Token Expired
- Re-authenticate via `/auth/start`
- Tokens typically last 60 days (long-lived tokens)

## Integration with Zoho Cliq

Once the backend is working:

1. Your Zoho Cliq bot should call these endpoints
2. Handle authentication flow in the bot
3. Store `userId` per Cliq user
4. Display data in Cliq cards/widgets

Example bot flow:
```
User: "Show my campaigns"
Bot → GET /meta/campaigns?userId=cliq_user_123&adAccountId=act_xxx
Bot → Format response as Cliq card
Bot → Display to user
```

