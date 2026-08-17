const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/leadhunter';
  
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });
    console.log(`[MegaTrix DB] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[MegaTrix DB] MongoDB Connection Error: ${error.message}`);
    // If remote connection fails, try local fallback
    if (uri.includes('mongodb+srv')) {
      console.log('[MegaTrix DB] Retrying with local MongoDB instance...');
      try {
        const localConn = await mongoose.connect('mongodb://127.0.0.1:27017/leadhunter', {
          serverSelectionTimeoutMS: 3000
        });
        console.log(`[MegaTrix DB] Connected to local MongoDB: ${localConn.connection.host}`);
        return localConn;
      } catch (localErr) {
        console.error('[MegaTrix DB] Local MongoDB fallback not reachable. Ensure network or MongoDB service is active.');
      }
    }
    return null;
  }
};

module.exports = connectDB;
