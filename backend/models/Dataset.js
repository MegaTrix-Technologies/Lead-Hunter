const mongoose = require('mongoose');

const datasetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
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
  totalLeads: {
    type: Number,
    default: 0
  },
  uncontactedCount: {
    type: Number,
    default: 0
  },
  contactedCount: {
    type: Number,
    default: 0
  },
  unreachableCount: {
    type: Number,
    default: 0
  },
  pipelineCount: {
    type: Number,
    default: 0
  },
  closedCount: {
    type: Number,
    default: 0
  },
  searchHistory: [
    {
      keyword: String,
      area: String,
      resultsCount: Number,
      executedAt: { type: Date, default: Date.now }
    }
  ]
}, {
  timestamps: true
});

datasetSchema.index({ name: 'text', description: 'text' });
datasetSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Dataset', datasetSchema);
