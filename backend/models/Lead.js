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
  
  // Outbound Calling Engine State
  callStatus: {
    type: String,
    enum: ['Uncontacted', 'IVR', 'Receptionist', 'Do Not Call', 'Shows Interest', 'Follow Up', 'Lead / Sale'],
    default: 'Uncontacted',
    index: true
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
  lastCalledAt: {
    type: Date,
    default: null
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

  // Extraction Job Reference
  scrapeJobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScrapeJob',
    default: null
  }
}, { 
  timestamps: true 
});

// Compound indexes for high-speed deduplication and exclusion queries
LeadSchema.index({ callStatus: 1, emailSentCount: 1 });
LeadSchema.index({ area: 1, category: 1 });
LeadSchema.index({ businessName: 1, area: 1 });

module.exports = mongoose.model('Lead', LeadSchema);
