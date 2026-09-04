const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true,
    index: true
  },
  assignedDevelopers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }],
  assignedDeveloperNames: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active',
    index: true
  },
  deliveryNotes: [{
    note: { type: String, required: true },
    author: { type: String, default: 'Developer' },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
  }],
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

ProjectSchema.index({ status: 1, createdAt: -1 });
ProjectSchema.index({ assignedDevelopers: 1, status: 1 });

module.exports = mongoose.model('Project', ProjectSchema);
