const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    default: null,
    index: true
  },
  customer: {
    businessName: { type: String, required: true, trim: true, index: true },
    phoneNumber: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    address: { type: String, default: '', trim: true },
    area: { type: String, default: 'Lahore', trim: true },
    category: { type: String, default: 'General', trim: true }
  },
  leadGeneratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  leadGeneratedByName: {
    type: String,
    default: 'N/A'
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  closedByName: {
    type: String,
    default: 'Super Admin'
  },
  assignedDevelopers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }],
  assignedDeveloperNames: [{
    type: String
  }],
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    name: { type: String, required: true },
    category: { type: String, default: '' },
    basePrice: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },
    currency: { type: String, default: 'PKR' }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
    index: true
  },
  advanceAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  remainingAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['advance_paid', 'project_active', 'project_completed', 'payment_completed'],
    default: 'advance_paid',
    index: true
  },
  source: {
    type: String,
    enum: ['manual', 'automated', 'migrated'],
    default: 'manual',
    index: true
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
    index: true
  },
  isProjectDelivered: {
    type: Boolean,
    default: false,
    index: true
  },
  deliveryCompletedAt: {
    type: Date,
    default: null
  },
  paymentMethod: {
    type: String,
    default: 'Bank Transfer',
    trim: true
  },
  paymentReference: {
    type: String,
    default: '',
    trim: true
  },
  closedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  paymentCompletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Calculate remaining amount before saving
SaleSchema.pre('save', function (next) {
  if (this.totalAmount !== undefined && this.advanceAmount !== undefined) {
    this.remainingAmount = Math.max(0, this.totalAmount - this.advanceAmount);
  }
  next();
});

// Indexes for high performance ledger and role-based filtering
SaleSchema.index({ closedAt: -1, status: 1 });
SaleSchema.index({ leadGeneratedBy: 1, status: 1 });
SaleSchema.index({ closedBy: 1, status: 1 });
SaleSchema.index({ assignedDevelopers: 1, status: 1 });

module.exports = mongoose.model('Sale', SaleSchema);
