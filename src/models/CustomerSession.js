import mongoose from 'mongoose';

const customerSessionSchema = new mongoose.Schema({
  // Customer reference
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID is required'],
    index: true
  },

  // Session identification
  sessionId: {
    type: String,
    required: [true, 'Session ID is required'],
    unique: true,
    index: true
  },

  // Session metadata
  ipAddress: {
    type: String,
    trim: true
  },

  userAgent: {
    type: String,
    trim: true
  },

  device: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown'
    },
    browser: String,
    os: String
  },

  location: {
    country: String,
    city: String,
    region: String
  },

  // Session timing
  expiresAt: {
    type: Date,
    required: [true, 'Expiry date is required'],
    index: true
  },

  lastActivityAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Session status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  logoutAt: {
    type: Date,
    default: null
  },

  // Activity tracking
  pageViews: {
    type: Number,
    default: 0,
    min: 0
  },

  activityLog: [{
    action: {
      type: String,
      enum: ['login', 'logout', 'page_view', 'add_to_cart', 'remove_from_cart', 'checkout', 'order_placed', 'profile_update'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: {
      type: mongoose.Schema.Types.Mixed
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
customerSessionSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

customerSessionSchema.virtual('sessionDuration').get(function() {
  const endTime = this.logoutAt || new Date();
  const startTime = this.createdAt;
  return Math.floor((endTime - startTime) / 1000); // Duration in seconds
});

customerSessionSchema.virtual('isValid').get(function() {
  return this.isActive && !this.isExpired;
});

// Indexes
customerSessionSchema.index({ customer: 1, isActive: 1 });
customerSessionSchema.index({ sessionId: 1 }, { unique: true });
customerSessionSchema.index({ expiresAt: 1 });
customerSessionSchema.index({ lastActivityAt: -1 });
customerSessionSchema.index({ createdAt: -1 });
customerSessionSchema.index({ customer: 1, createdAt: -1 });

// TTL index - automatically delete expired sessions after 7 days
customerSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

// Static methods
customerSessionSchema.statics.createSession = async function(customerId, sessionId, expiresAt, metadata = {}) {
  const session = new this({
    customer: customerId,
    sessionId,
    expiresAt,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    device: metadata.device,
    location: metadata.location
  });
  
  return await session.save();
};

customerSessionSchema.statics.findValidSession = async function(sessionId) {
  return await this.findOne({
    sessionId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).populate('customer', 'firstName lastName email isVerified');
};

customerSessionSchema.statics.getActiveSessionsByCustomer = function(customerId) {
  return this.find({
    customer: customerId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).sort({ lastActivityAt: -1 });
};

customerSessionSchema.statics.getSessionHistory = function(customerId, options = {}) {
  const { limit = 10, page = 1 } = options;
  const skip = (page - 1) * limit;
  
  return this.find({ customer: customerId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-activityLog'); // Exclude activity log for performance
};

customerSessionSchema.statics.invalidateCustomerSessions = async function(customerId, exceptSessionId = null) {
  const query = {
    customer: customerId,
    isActive: true
  };
  
  if (exceptSessionId) {
    query.sessionId = { $ne: exceptSessionId };
  }
  
  return await this.updateMany(
    query,
    {
      $set: {
        isActive: false,
        logoutAt: new Date()
      }
    }
  );
};

customerSessionSchema.statics.deleteSession = async function(sessionId) {
  return await this.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        isActive: false,
        logoutAt: new Date()
      }
    }
  );
};

customerSessionSchema.statics.cleanupExpiredSessions = async function() {
  const now = new Date();
  
  // Mark expired sessions as inactive
  const result = await this.updateMany(
    {
      expiresAt: { $lt: now },
      isActive: true
    },
    {
      $set: {
        isActive: false,
        logoutAt: now
      }
    }
  );
  
  return result;
};

customerSessionSchema.statics.getSessionStats = async function(customerId) {
  const pipeline = [
    { $match: { customer: new mongoose.Types.ObjectId(customerId) } },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        activeSessions: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        totalPageViews: { $sum: '$pageViews' },
        averageSessionDuration: { $avg: '$sessionDuration' },
        lastActive: { $max: '$lastActivityAt' }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalSessions: 0,
    activeSessions: 0,
    totalPageViews: 0,
    averageSessionDuration: 0,
    lastActive: null
  };
};

// Instance methods
customerSessionSchema.methods.updateActivity = async function(activityType = 'page_view', metadata = {}) {
  const maxRetries = 3;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      // Use findByIdAndUpdate to avoid version conflicts
      const updated = await this.constructor.findByIdAndUpdate(
        this._id,
        {
          $set: {
            lastActivityAt: new Date()
          },
          $inc: {
            pageViews: activityType === 'page_view' ? 1 : 0
          },
          $push: {
            activityLog: {
              $each: [{
                action: activityType, // Fixed: use 'action' instead of 'type'
                timestamp: new Date(),
                metadata
              }],
              $slice: -50 // Keep only last 50 activities
            }
          }
        },
        { 
          new: true,
          runValidators: true
        }
      );
      
      if (updated) {
        // Update the current instance with the new data
        this.lastActivityAt = updated.lastActivityAt;
        this.pageViews = updated.pageViews;
        this.activityLog = updated.activityLog;
        return this;
      } else {
        throw new Error('Session not found');
      }
    } catch (error) {
      if (error.name === 'VersionError' && retries < maxRetries - 1) {
        retries++;
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 50 * retries));
        
        // Refresh the document from database
        const refreshed = await this.constructor.findById(this._id);
        if (refreshed) {
          this.set(refreshed.toObject());
        }
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('Failed to update activity after maximum retries');
};

customerSessionSchema.methods.extendSession = async function(additionalTime = 7 * 24 * 60 * 60 * 1000) {
  this.expiresAt = new Date(Date.now() + additionalTime);
  this.lastActivityAt = new Date();
  return await this.save();
};

customerSessionSchema.methods.invalidate = async function() {
  this.isActive = false;
  this.logoutAt = new Date();
  return await this.save();
};

customerSessionSchema.methods.logActivity = async function(action, details = {}) {
  this.activityLog.push({
    action,
    timestamp: new Date(),
    details
  });
  
  this.lastActivityAt = new Date();
  
  // Limit activity log size
  if (this.activityLog.length > 100) {
    this.activityLog = this.activityLog.slice(-100);
  }
  
  return await this.save();
};

// Pre-save middleware
customerSessionSchema.pre('save', function(next) {
  // Automatically mark as inactive if expired
  if (this.isExpired && this.isActive) {
    this.isActive = false;
    if (!this.logoutAt) {
      this.logoutAt = new Date();
    }
  }
  
  next();
});

const CustomerSession = mongoose.models.CustomerSession || mongoose.model('CustomerSession', customerSessionSchema);

export default CustomerSession;
