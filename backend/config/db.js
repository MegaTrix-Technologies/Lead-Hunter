const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/leadhunter';

  const connectionOptions = {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 20000,
    socketTimeoutMS: 45000,
    maxPoolSize: 20,
    family: 4 // Force IPv4 to prevent Windows DNS resolution timeouts
  };

  // Reconnection event hooks
  mongoose.connection.on('disconnected', () => {
    console.warn('[MegaTrix DB] MongoDB disconnected. Attempting automatic reconnection...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[MegaTrix DB] MongoDB successfully reconnected.');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[MegaTrix DB] Connection runtime error:', err.message);
  });

  let retries = 5;
  while (retries > 0) {
    try {
      const conn = await mongoose.connect(uri, connectionOptions);
      console.log(`[MegaTrix DB] MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      retries--;
      console.warn(`[MegaTrix DB] Connection attempt failed (${error.message}). Retries remaining: ${retries}`);
      if (retries === 0) {
        // If remote connection completely fails, try local fallback
        if (uri.includes('mongodb+srv')) {
          console.log('[MegaTrix DB] Retrying with local MongoDB instance...');
          try {
            const localConn = await mongoose.connect('mongodb://127.0.0.1:27017/leadhunter', {
              serverSelectionTimeoutMS: 5000,
              family: 4
            });
            console.log(`[MegaTrix DB] Connected to local MongoDB: ${localConn.connection.host}`);
            return localConn;
          } catch (localErr) {
            console.error('[MegaTrix DB] Local MongoDB fallback not reachable. Ensure network or MongoDB service is active.');
          }
        }
        return null;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
};

module.exports = connectDB;
