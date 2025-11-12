const mongoose = require('mongoose');

const userTokenSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },
  tokenType: {
    type: String,
    default: 'Bearer'
  },
  adAccountId: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
userTokenSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if token is expired
userTokenSchema.methods.isExpired = function() {
  if (!this.expiresAt) {
    return false; // If no expiry date, assume token doesn't expire
  }
  return Date.now() >= this.expiresAt;
};

// Method to check if token needs refresh (within 5 minutes of expiry)
userTokenSchema.methods.needsRefresh = function() {
  if (!this.expiresAt) {
    return false;
  }
  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() >= (this.expiresAt.getTime() - fiveMinutes);
};

const UserToken = mongoose.model('UserToken', userTokenSchema);

module.exports = UserToken;

