const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    default: 'Operational Expense'
  },
  recurrence: {
    type: String,
    enum: ['one_time', 'monthly', 'yearly'],
    default: 'one_time',
    index: true
  },
  category: {
    type: String,
    enum: [
      'Software & Infrastructure',
      'Marketing & Lead Gen',
      'Office & Utilities',
      'Telephony & Dialing',
      'Sales Commission',
      'Legal & Compliance',
      'Miscellaneous'
    ],
    default: 'Miscellaneous',
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
  description: {
    type: String,
    required: true,
    trim: true
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'Company Card', 'Cash', 'Online Gateway', 'Cheque'],
    default: 'Bank Transfer'
  },
  referenceId: {
    type: String,
    default: '',
    trim: true
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

// Compound index for high-speed period and category aggregation queries
ExpenseSchema.index({ date: -1, category: 1 });
ExpenseSchema.index({ date: 1, amount: 1 });

module.exports = mongoose.model('Expense', ExpenseSchema);
