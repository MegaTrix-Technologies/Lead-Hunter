const mongoose = require('mongoose');

const InflowSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['project_payment', 'investment', 'other_income'],
    required: true,
    index: true
  },
  sourceName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  category: {
    type: String,
    enum: [
      'Project Milestone Payment',
      'Direct Capital Investment',
      'Equity / Angel Fund',
      'Founder Loan / Capital Injection',
      'Consultancy Services',
      'Affiliate & Partner Commission',
      'Custom Development Fee',
      'Miscellaneous Income'
    ],
    default: 'Miscellaneous Income',
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
    index: true
  },
  currency: {
    type: String,
    default: 'PKR'
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'Company Card', 'Cash', 'Online Gateway', 'Cheque', 'Direct Deposit'],
    default: 'Bank Transfer'
  },
  referenceId: {
    type: String,
    default: '',
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    default: null,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdByName: {
    type: String,
    default: 'Super Admin'
  }
}, {
  timestamps: true
});

// Compound indexes for rapid chronological and category financial reporting
InflowSchema.index({ date: -1, type: 1 });
InflowSchema.index({ date: 1, amount: 1 });
InflowSchema.index({ saleId: 1, date: -1 });

module.exports = mongoose.model('Inflow', InflowSchema);
