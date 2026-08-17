const mongoose = require('mongoose');

const EmailTemplateSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  subject: { 
    type: String, 
    required: true,
    trim: true 
  },
  bodyHtml: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    default: 'General' 
  },
  isDefault: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('EmailTemplate', EmailTemplateSchema);
