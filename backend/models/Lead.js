const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  placeId: { 
    type: String, 
    unique: true, 
    required: true,
    index: true 
  },
  businessName: { 
    type: String, 
    required: true,
    trim: true,
    index: true 
  },
  avatarUrl: { 
    type: String, 
    default: '' 
  },
  rating: { 
    type: Number, 
    default: 0 
  },
  reviewCount: { 
    type: Number, 
    default: 0 
  },
  phoneNumber: { 
    type: String, 
    default: '',
    trim: true 
  },
  email: { 
    type: String, 
    default: '',
    trim: true,
    lowercase: true 
  },
  website: { 
    type: String, 
    default: '',
    trim: true 
  },
  address: { 
    type: String, 
    default: '',
    trim: true 
  },
  area: { 
    type: String, 
    required: true,
    index: true 
  },
  category: { 
    type: String, 
    required: true,
    index: true 
  },
  registeredDate: { 
    type: Date,
    default: Date.now 
  },
  
  // Outbound Calling Engine State (includes Unreachable as retryable status)
  callStatus: {
    type: String,
    enum: [
      'Uncontacted', 'Unreachable', 'IVR', 'Receptionist', 
      'Do Not Call', 'Shows Interest', 'Follow Up', 'Closer Follow Up', 'Lead / Sale',
      'Lead', 'processing', 'denied', 'sale'
    ],
    default: 'Uncontacted',
    index: true
  },
  additionalInfo: {
    type: String,
    default: '',
    trim: true
  },
  callNotes: [{
    note: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    author: { type: String, default: 'MegaTrix Agent' }
  }],
  followUpDate: {
    type: Date,
    default: null
  },
  followUpType: {
    type: String,
    enum: ['sales_agent', 'sales_closer', null],
    default: null,
    index: true
  },
  followUpBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null
  },
  followUpByName: {
    type: String,
    default: ''
  },
  closerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null
  },
  closerName: {
    type: String,
    default: ''
  },
  closerFollowUpDate: {
    type: Date,
    default: null
  },
  lastCalledAt: {
    type: Date,
    default: null
  },
  
  // Product Catalog Deal Tracking
  interestedProducts: [{
    productId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product' 
    },
    name: { 
      type: String, 
      required: true 
    },
    category: { 
      type: String 
    },
    basePrice: { 
      type: Number, 
      required: true 
    },
    discountPercent: { 
      type: Number, 
      default: 0 
    },
    finalPrice: { 
      type: Number, 
      required: true 
    },
    currency: { 
      type: String, 
      default: 'PKR' 
    },
    addedAt: { 
      type: Date, 
      default: Date.now 
    }
  }],
  dealValue: {
    type: Number,
    default: 0,
    index: true
  },
  
  // Email Proposal State
  emailSentCount: { 
    type: Number, 
    default: 0,
    index: true 
  },
  emailHistory: [{
    sentAt: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ['sent', 'delivered', 'bounced', 'spam', 'invalid'],
      default: 'sent' 
    },
    templateId: { type: String, default: '' },
    templateName: { type: String, default: '' },
    subject: { type: String, default: '' }
  }],
  lastEmailedAt: {
    type: Date,
    default: null
  },

  // Dataset Association
  datasetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dataset',
    index: true,
    default: null
  },
  datasetIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dataset',
    index: true
  }],

  // Extraction Job Reference
  scrapeJobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScrapeJob',
    default: null
  },

  // User Attribution (Multi-User RBAC)
  extractedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null
  },
  extractedByName: {
    type: String,
    default: 'Super Admin'
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null
  },
  generatedByName: {
    type: String,
    default: ''
  },
  leadGeneratedAt: {
    type: Date,
    default: null
  },

  // Do Not Call (DNC) Audit Tracking
  dncAt: {
    type: Date,
    default: null,
    index: true
  },
  dncBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  dncByName: {
    type: String,
    default: ''
  },

  // Deal Conversion Tracking
  convertedAt: {
    type: Date,
    default: null,
    index: true
  }
}, { 
  timestamps: true 
});

LeadSchema.pre('save', function (next) {
  if (this.extractedBy && !this.generatedBy) {
    this.generatedBy = this.extractedBy;
    this.generatedByName = this.extractedByName;
  } else if (this.generatedBy && !this.extractedBy) {
    this.extractedBy = this.generatedBy;
    this.extractedByName = this.generatedByName;
  }
  next();
});

// Compound indexes for high-speed deduplication and exclusion queries
LeadSchema.index({ callStatus: 1, emailSentCount: 1 });
LeadSchema.index({ area: 1, category: 1 });
LeadSchema.index({ businessName: 1, area: 1 });
LeadSchema.index({ datasetId: 1, callStatus: 1 });
LeadSchema.index({ extractedBy: 1, callStatus: 1 });
LeadSchema.index({ generatedBy: 1, callStatus: 1 });
LeadSchema.index({ closerId: 1, callStatus: 1 });
LeadSchema.index({ followUpBy: 1, callStatus: 1 });
LeadSchema.index({ phoneNumber: 1, callStatus: 1 });
LeadSchema.index({ placeId: 1, callStatus: 1 });

module.exports = mongoose.model('Lead', LeadSchema);
