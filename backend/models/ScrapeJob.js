const mongoose = require('mongoose');

const ScrapeJobSchema = new mongoose.Schema({
  keyword: { 
    type: String, 
    required: true,
    trim: true 
  },
  area: { 
    type: String, 
    required: true,
    trim: true 
  },
  filtersApplied: {
    noWebsiteOnly: { type: Boolean, default: false },
    recentlyRegistered: { type: Boolean, default: false },
    maxRating: { type: Number, default: 5.0 },
    strictSearch: { type: Boolean, default: true }
  },
  totalExtracted: { 
    type: Number, 
    default: 0 
  },
  totalQualified: { 
    type: Number, 
    default: 0 
  },
  totalExcluded: { 
    type: Number, 
    default: 0 
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('ScrapeJob', ScrapeJobSchema);
