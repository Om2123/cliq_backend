require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const metaRoutes = require('./routes/meta');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/meta', metaRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Zoho Cliq + Meta Ads Integration API',
    version: '1.0.0',
    endpoints: {
      auth: {
        start: 'GET /auth/start?userId=USER_ID',
        callback: 'GET /auth/callback?code=CODE&state=STATE',
        status: 'GET /auth/status?userId=USER_ID'
      },
      meta: {
        campaigns: 'GET /meta/campaigns?userId=USER_ID&adAccountId=ACT_123',
        spend: 'GET /meta/spend?userId=USER_ID&adAccountId=ACT_123',
        leads: 'GET /meta/leads?userId=USER_ID&adAccountId=ACT_123',
        adsets: 'GET /meta/adsets?userId=USER_ID&adAccountId=ACT_123',
        accounts: 'GET /meta/accounts?userId=USER_ID'
      }
    }
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API available at http://localhost:${PORT}`);
});

