import mongoose from 'mongoose';

const WishlistItemSchema = new mongoose.Schema({
  // Product reference
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: [true, 'Product ID is required']
  },
  
  // Product snapshot at time of adding to wishlist
  productSnapshot: {
    productName: {
      type: String,
      required: true
    },
    sku: String,
    image: String,
    category: String,
    brand: String,
    description: String,
    unitOfMeasure: String,
    sellingPrice: {
      type: Number,
      required: true,
      min: 0
    },
    costPrice: Number,
    quantityInStock: {
      type: Number,
      default: 0
    },
    reorderLevel: Number,
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Discontinued'],
      default: 'Active'
    },
    webVisibility: {
      type: Boolean,
      default: true
    }
  },
  
  // Store information
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: [true, 'Store ID is required']
  },
  
  // Store snapshot at time of adding to wishlist
  storeSnapshot: {
    storeName: {
      type: String,
      required: true
    },
    storeSlug: String,
    storePhone: String,
    storeEmail: String,
    storeType: {
      type: String,
      enum: ['physical', 'online'],
      default: 'physical'
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String
    },
    branding: {
      logo: String,
      primaryColor: {
        type: String,
        default: '#0D9488'
      },
      secondaryColor: {
        type: String,
        default: '#F3F4F6'
      }
    },
    settings: {
      currency: {
        type: String,
        default: 'NGN',
        enum: ['NGN', 'USD', 'EUR', 'GBP']
      }
    },
    ivmaWebsite: {
      websitePath: String,
      isEnabled: Boolean
    }
  },
  
  // Store owner reference
  storeOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Store owner ID is required']
  },
  
  // Wishlist item metadata
  addedAt: {
    type: Date,
    default: Date.now
  },
  
  // Priority level (for customer organization)
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  
  // Private notes from customer
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: ''
  },
  
  // Notification preferences for this item
  notifications: {
    priceDropAlert: {
      type: Boolean,
      default: true
    },
    backInStockAlert: {
      type: Boolean,
      default: true
    },
    targetPrice: {
      type: Number,
      min: 0,
      default: null
    }
  }
}, { _id: true });

const WishlistSchema = new mongoose.Schema({
  // Customer reference
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID is required'],
    index: true
  },
  
  // Customer snapshot for quick access
  customerSnapshot: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String
  },
  
  // Wishlist items
  items: [WishlistItemSchema],
  
  // Wishlist metadata
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Wishlist name cannot exceed 100 characters'],
    default: 'My Wishlist'
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  
  // Privacy settings
  isPublic: {
    type: Boolean,
    default: false
  },
  
  shareCode: {
    type: String,
    unique: true,
    sparse: true, // Allow null values
    default: null
  },
  
  // Wishlist statistics
  stats: {
    totalItems: {
      type: Number,
      default: 0
    },
    totalValue: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    viewCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
WishlistSchema.virtual('itemCount').get(function() {
  return this.items.length;
});

WishlistSchema.virtual('totalWishlistValue').get(function() {
  return this.items.reduce((sum, item) => sum + (item.productSnapshot.sellingPrice || 0), 0);
});

WishlistSchema.virtual('averageItemPrice').get(function() {
  if (this.items.length === 0) return 0;
  return this.totalWishlistValue / this.items.length;
});

WishlistSchema.virtual('storeCount').get(function() {
  const uniqueStores = new Set(this.items.map(item => item.store.toString()));
  return uniqueStores.size;
});

WishlistSchema.virtual('inStockItems').get(function() {
  return this.items.filter(item => 
    item.productSnapshot.quantityInStock > 0 && 
    item.productSnapshot.status === 'Active' &&
    item.productSnapshot.webVisibility
  );
});

WishlistSchema.virtual('outOfStockItems').get(function() {
  return this.items.filter(item => 
    item.productSnapshot.quantityInStock === 0 || 
    item.productSnapshot.status !== 'Active' ||
    !item.productSnapshot.webVisibility
  );
});

// Pre-save middleware
WishlistSchema.pre('save', function(next) {
  // Update stats
  this.stats.totalItems = this.items.length;
  this.stats.totalValue = this.totalWishlistValue;
  this.stats.lastUpdated = new Date();
  
  // Generate share code if wishlist is made public and doesn't have one
  if (this.isPublic && !this.shareCode) {
    this.shareCode = generateShareCode();
  }
  
  // Remove share code if wishlist is made private
  if (!this.isPublic && this.shareCode) {
    this.shareCode = null;
  }
  
  next();
});

// Static methods
WishlistSchema.statics.createWishlist = async function(customerId, customerSnapshot, name = 'My Wishlist') {
  const wishlist = new this({
    customer: customerId,
    customerSnapshot,
    name
  });
  return await wishlist.save();
};

WishlistSchema.statics.getCustomerWishlist = function(customerId) {
  return this.findOne({ customer: customerId })
    .populate('items.product', 'productName sku sellingPrice quantityInStock status webVisibility')
    .populate('items.store', 'storeName storePhone storeEmail branding settings ivmaWebsite');
};

WishlistSchema.statics.getWishlistByShareCode = function(shareCode) {
  return this.findOne({ 
    shareCode, 
    isPublic: true 
  })
  .populate('customer', 'firstName lastName')
  .populate('items.product', 'productName sku sellingPrice quantityInStock status webVisibility')
  .populate('items.store', 'storeName branding settings ivmaWebsite');
};

WishlistSchema.statics.getWishlistsByStore = function(storeId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;
  
  return this.find({ 
    'items.store': storeId,
    isPublic: true 
  })
  .sort({ 'stats.lastUpdated': -1 })
  .skip(skip)
  .limit(limit)
  .populate('customer', 'firstName lastName')
  .select('name description stats customer items');
};

WishlistSchema.statics.getPopularWishlists = function(limit = 10) {
  return this.find({ 
    isPublic: true,
    'stats.totalItems': { $gt: 0 }
  })
  .sort({ 'stats.viewCount': -1, 'stats.totalItems': -1 })
  .limit(limit)
  .populate('customer', 'firstName lastName')
  .select('name description stats customer');
};

// Instance methods
WishlistSchema.methods.addItem = async function(productData, storeData, storeOwnerId, options = {}) {
  const { priority = 'medium', notes = '', notifications = {} } = options;
  
  // Check if item already exists
  const existingItemIndex = this.items.findIndex(item => 
    item.product.toString() === productData._id.toString()
  );
  
  if (existingItemIndex !== -1) {
    // Update existing item
    this.items[existingItemIndex].priority = priority;
    this.items[existingItemIndex].notes = notes;
    this.items[existingItemIndex].notifications = {
      ...this.items[existingItemIndex].notifications,
      ...notifications
    };
    this.items[existingItemIndex].addedAt = new Date();
  } else {
    // Add new item
    const newItem = {
      product: productData._id,
      productSnapshot: {
        productName: productData.productName,
        sku: productData.sku,
        image: productData.image,
        category: productData.category,
        brand: productData.brand,
        description: productData.description,
        unitOfMeasure: productData.unitOfMeasure,
        sellingPrice: productData.sellingPrice,
        costPrice: productData.costPrice,
        quantityInStock: productData.quantityInStock,
        reorderLevel: productData.reorderLevel,
        status: productData.status,
        webVisibility: productData.webVisibility
      },
      store: storeData._id,
      storeSnapshot: {
        storeName: storeData.storeName,
        storeSlug: storeData.ivmaWebsite?.websitePath,
        storePhone: storeData.storePhone,
        storeEmail: storeData.storeEmail,
        storeType: storeData.storeType,
        address: storeData.address,
        branding: storeData.branding,
        settings: storeData.settings,
        ivmaWebsite: {
          websitePath: storeData.ivmaWebsite?.websitePath,
          isEnabled: storeData.ivmaWebsite?.isEnabled
        }
      },
      storeOwner: storeOwnerId,
      priority,
      notes,
      notifications: {
        priceDropAlert: true,
        backInStockAlert: true,
        targetPrice: null,
        ...notifications
      }
    };
    
    this.items.push(newItem);
  }
  
  return await this.save();
};

WishlistSchema.methods.removeItem = async function(productId) {
  this.items = this.items.filter(item => 
    item.product.toString() !== productId.toString()
  );
  return await this.save();
};

WishlistSchema.methods.updateItemNotes = async function(productId, notes) {
  const item = this.items.find(item => 
    item.product.toString() === productId.toString()
  );
  
  if (item) {
    item.notes = notes;
    return await this.save();
  }
  
  throw new Error('Item not found in wishlist');
};

WishlistSchema.methods.updateItemPriority = async function(productId, priority) {
  const item = this.items.find(item => 
    item.product.toString() === productId.toString()
  );
  
  if (item) {
    item.priority = priority;
    return await this.save();
  }
  
  throw new Error('Item not found in wishlist');
};

WishlistSchema.methods.updateNotificationSettings = async function(productId, notifications) {
  const item = this.items.find(item => 
    item.product.toString() === productId.toString()
  );
  
  if (item) {
    item.notifications = {
      ...item.notifications,
      ...notifications
    };
    return await this.save();
  }
  
  throw new Error('Item not found in wishlist');
};

WishlistSchema.methods.clearWishlist = async function() {
  this.items = [];
  return await this.save();
};

WishlistSchema.methods.makePublic = async function() {
  this.isPublic = true;
  if (!this.shareCode) {
    this.shareCode = generateShareCode();
  }
  return await this.save();
};

WishlistSchema.methods.makePrivate = async function() {
  this.isPublic = false;
  this.shareCode = null;
  return await this.save();
};

WishlistSchema.methods.incrementViewCount = async function() {
  this.stats.viewCount += 1;
  return await this.save();
};

WishlistSchema.methods.getItemsByStore = function() {
  const storeGroups = {};
  
  this.items.forEach(item => {
    const storeId = item.store.toString();
    if (!storeGroups[storeId]) {
      storeGroups[storeId] = {
        store: item.store,
        storeSnapshot: item.storeSnapshot,
        items: [],
        totalValue: 0,
        itemCount: 0
      };
    }
    
    storeGroups[storeId].items.push(item);
    storeGroups[storeId].totalValue += item.productSnapshot.sellingPrice || 0;
    storeGroups[storeId].itemCount += 1;
  });
  
  return Object.values(storeGroups);
};

WishlistSchema.methods.getItemsByPriority = function(priority) {
  return this.items.filter(item => item.priority === priority);
};

WishlistSchema.methods.getPriceDropAlerts = function() {
  return this.items.filter(item => 
    item.notifications.priceDropAlert && 
    item.notifications.targetPrice &&
    item.productSnapshot.sellingPrice > item.notifications.targetPrice
  );
};

WishlistSchema.methods.getBackInStockAlerts = function() {
  return this.items.filter(item => 
    item.notifications.backInStockAlert && 
    item.productSnapshot.quantityInStock === 0
  );
};

// Helper function to generate share code
function generateShareCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Indexes
WishlistSchema.index({ customer: 1 }, { unique: true });
WishlistSchema.index({ shareCode: 1 }, { unique: true, sparse: true });
WishlistSchema.index({ isPublic: 1, 'stats.viewCount': -1 });
WishlistSchema.index({ 'items.store': 1 });
WishlistSchema.index({ 'items.product': 1 });
WishlistSchema.index({ 'stats.lastUpdated': -1 });
WishlistSchema.index({ customer: 1, 'items.product': 1 }, { unique: true });

const Wishlist = mongoose.models.Wishlist || mongoose.model('Wishlist', WishlistSchema);

export default Wishlist;
