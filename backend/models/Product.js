const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Web Development',
      'E-Commerce',
      'Digital Marketing',
      'SEO',
      'Design & Branding',
      'Mobile App',
      'Maintenance & Hosting',
      'Other'
    ],
    default: 'Web Development',
    index: true
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  maxDiscountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  currency: {
    type: String,
    default: 'PKR',
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  deliverables: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Virtual property for minimum price floor
productSchema.virtual('minPrice').get(function() {
  const discountMultiplier = (100 - (this.maxDiscountPercent || 0)) / 100;
  return Math.round(this.basePrice * discountMultiplier);
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
