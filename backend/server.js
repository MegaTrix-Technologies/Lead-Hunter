const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const leadRoutes = require('./routes/leadRoutes');
const datasetRoutes = require('./routes/datasetRoutes');
const scraperRoutes = require('./routes/scraperRoutes');
const emailRoutes = require('./routes/emailRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'MegaTrix LeadEngine & CRM',
    version: '1.0.0',
    timestamp: new Date()
  });
});

// Serve frontend in production if built
if (process.env.NODE_ENV === 'production') {
  const frontendBuild = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[MegaTrix Server Error]:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const startServer = () => {
  connectDB().catch(err => console.error('[MegaTrix DB] Connect catch:', err.message));
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  🚀 MegaTrix LeadEngine & CRM Backend Active`);
    console.log(`  📡 API Server: http://localhost:${PORT}`);
    console.log(`  ⚡ Endpoints:`);
    console.log(`     - /api/auth`);
    console.log(`     - /api/leads`);
    console.log(`     - /api/datasets`);
    console.log(`     - /api/scraper`);
    console.log(`     - /api/email`);
    console.log(`     - /api/analytics`);
    console.log(`======================================================\n`);
  });
};

startServer();
