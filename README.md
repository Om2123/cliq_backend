# Zoho Cliq + Meta Ads Integration Backend

A Node.js/Express backend API for integrating Meta (Facebook) Ads with Zoho Cliq. This backend handles OAuth authentication, securely stores access tokens, and provides REST APIs to fetch campaign data, spend insights, leads, and ad sets.

## Features

- ✅ Meta OAuth 2.0 authentication flow
- ✅ Secure token storage in MongoDB
- ✅ REST APIs for campaigns, spend, leads, and ad sets
- ✅ Token expiration handling
- ✅ Error handling and validation
- ✅ Long-lived token support

## Tech Stack

- **Node.js** with Express.js
- **MongoDB** with Mongoose
- **Axios** for HTTP requests
- **dotenv** for environment configuration

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance like MongoDB Atlas)
- Meta (Facebook) App with Ads API access

## Setup Instructions

### 1. Clone and Install

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=3000
NODE_ENV=development

# MongoDB - Use your MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/zoho_meta_ads
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/zoho_meta_ads

# Meta OAuth Credentials
# Get these from https://developers.facebook.com/apps/
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_REDIRECT_URI=http://localhost:3000/auth/callback

# Optional
CORS_ORIGIN=http://localhost:3000
```

### 3. Meta App Setup

1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Create a new app or use an existing one
3. Add "Marketing API" product to your app
4. Get your **App ID** and **App Secret**
5. Add `http://localhost:3000/auth/callback` to Valid OAuth Redirect URIs
6. Request the following permissions:
   - `ads_read`
   - `ads_management`
   - `business_management`
   - `leads_retrieval`

### 4. Start MongoDB

Make sure MongoDB is running locally, or use a cloud instance.

### 5. Run the Server

```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication

#### Start OAuth Flow
```
GET /auth/start?userId=USER_ID
```

Returns an OAuth URL that the user should visit to authenticate.

**Response:**
```json
{
  "success": true,
  "authUrl": "https://www.facebook.com/v18.0/dialog/oauth?...",
  "message": "Redirect user to this URL to authenticate"
}
```

#### OAuth Callback
```
GET /auth/callback?code=CODE&state=STATE
```

Handles the OAuth callback from Meta. This endpoint is called automatically by Meta after user authentication.

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "userId": "user123",
  "expiresAt": "2024-03-15T10:30:00.000Z"
}
```

#### Check Auth Status
```
GET /auth/status?userId=USER_ID
```

Check if a user is authenticated and if their token is still valid.

**Response:**
```json
{
  "success": true,
  "authenticated": true,
  "expired": false,
  "expiresAt": "2024-03-15T10:30:00.000Z",
  "adAccountId": "act_123456789"
}
```

### Meta Ads API

All Meta endpoints require `userId` as a query parameter. The user must be authenticated first.

#### Get Campaigns
```
GET /meta/campaigns?userId=USER_ID&adAccountId=act_123456789&limit=25
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123456789",
      "name": "Summer Sale Campaign",
      "status": "ACTIVE",
      "objective": "CONVERSIONS",
      "daily_budget": "100",
      "created_time": "2024-01-15T10:00:00+0000"
    }
  ],
  "paging": { ... }
}
```

#### Get Spend/Insights
```
GET /meta/spend?userId=USER_ID&adAccountId=act_123456789&datePreset=last_30d&level=campaign
```

**Query Parameters:**
- `datePreset`: `today`, `yesterday`, `last_7d`, `last_30d`, `this_month`, `last_month`, etc.
- `level`: `account`, `campaign`, `adset`, `ad`
- `timeRange`: JSON string like `{"since":"2024-01-01","until":"2024-01-31"}`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "campaign_id": "123456789",
      "campaign_name": "Summer Sale",
      "spend": "150.50",
      "impressions": "5000",
      "clicks": "250",
      "ctr": "5.0",
      "cpc": "0.60"
    }
  ]
}
```

#### Get Leads
```
GET /meta/leads?userId=USER_ID&adAccountId=act_123456789&limit=25
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "lead_123",
      "form_id": "form_456",
      "form_name": "Contact Form",
      "created_time": "2024-01-20T15:30:00+0000",
      "field_data": [...]
    }
  ]
}
```

#### Get Ad Sets
```
GET /meta/adsets?userId=USER_ID&adAccountId=act_123456789&campaignId=CAMPAIGN_ID&limit=25
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "adset_123",
      "name": "Ad Set 1",
      "status": "ACTIVE",
      "campaign_id": "123456789",
      "daily_budget": "50",
      "optimization_goal": "OFFSITE_CONVERSIONS"
    }
  ]
}
```

#### Get Ad Accounts
```
GET /meta/accounts?userId=USER_ID
```

Returns all ad accounts associated with the authenticated user.

## Usage Flow

1. **User initiates authentication:**
   ```
   GET /auth/start?userId=user123
   ```
   Returns `authUrl` - redirect user to this URL.

2. **User authenticates on Meta** and is redirected back to `/auth/callback`

3. **Token is stored** in MongoDB automatically

4. **Make API calls:**
   ```
   GET /meta/campaigns?userId=user123&adAccountId=act_123456789
   ```

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common errors:
- `401`: User not authenticated or token expired
- `400`: Missing required parameters
- `500`: Internal server error

## Token Management

- Tokens are automatically stored in MongoDB after OAuth
- Long-lived tokens (60 days) are requested automatically
- Token expiration is checked on each API call
- Users need to re-authenticate when tokens expire

## Development

### Project Structure

```
.
├── config/
│   └── database.js          # MongoDB connection
├── middleware/
│   └── errorHandler.js      # Error handling middleware
├── models/
│   └── UserToken.js         # UserToken schema
├── routes/
│   ├── auth.js              # OAuth routes
│   └── meta.js              # Meta API routes
├── services/
│   └── metaApi.js           # Meta Graph API client
├── server.js                # Express app entry point
├── .env.example             # Environment template
└── package.json
```

### Testing

Test endpoints manually using:
- Postman
- curl
- Browser (for GET requests)

Example:
```bash
curl "http://localhost:3000/auth/start?userId=test123"
```

## Deployment

### Environment Variables

Ensure all environment variables are set in your production environment.

### MongoDB

Use MongoDB Atlas or another cloud MongoDB service for production.

### Meta App Configuration

Update `META_REDIRECT_URI` to your production callback URL:
```
META_REDIRECT_URI=https://yourdomain.com/auth/callback
```

### Recommended Platforms

- **Vercel** (serverless)
- **Heroku**
- **Render**
- **Railway**

## Security Notes

- Never commit `.env` file
- Use environment variables for all secrets
- Tokens are stored securely in MongoDB
- Validate all user inputs
- Use HTTPS in production

## Troubleshooting

### "User not authenticated"
- Complete OAuth flow first via `/auth/start`
- Check if token expired via `/auth/status`

### "adAccountId is required"
- Provide `adAccountId` in query params, or
- Complete OAuth to auto-detect ad account

### MongoDB connection errors
- Verify MongoDB is running
- Check `MONGODB_URI` in `.env`
- Ensure network access if using cloud MongoDB

## License

ISC

## Support

For issues or questions, check the Meta Marketing API documentation:
https://developers.facebook.com/docs/marketing-apis

#   c l i q _ b a c k e n d  
 #   c l i q _ b a c k e n d  
 