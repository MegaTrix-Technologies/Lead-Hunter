const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['superadmin', 'agent'],
    default: 'agent',
    index: true
  },
  roles: {
    type: [String],
    enum: ['super_admin', 'sales_agent', 'sales_closer', 'developer'],
    default: ['sales_agent'],
    index: true
  },
  commissionRates: {
    leadGenPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    closerPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    developerPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  status: {
    type: String,
    enum: ['active', 'blocked'],
    default: 'active',
    index: true
  },
  dailyGmbLimit: {
    type: Number,
    default: 150
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Sync role string and roles array before save
UserSchema.pre('save', function (next) {
  if (this.roles && this.roles.includes('super_admin')) {
    this.role = 'superadmin';
  } else {
    this.role = 'agent';
  }
  next();
});

// Pre-save hook to hash password if modified
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
