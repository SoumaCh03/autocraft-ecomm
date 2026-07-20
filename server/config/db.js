import mongoose from 'mongoose';

const connectDB = async () => {
  const MAX_RETRIES = 5;
  let retries = 0;

  const attemptConnection = async () => {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI);
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
      console.error(`❌ MongoDB Connection Error: ${error.message}`);
      retries++;
      if (retries <= MAX_RETRIES) {
        const delay = Math.pow(2, retries) * 1000; // Exponential backoff: 2s, 4s, 8s, 16s...
        console.log(`⏳ Retrying MongoDB connection in ${delay / 1000} seconds... (Attempt ${retries}/${MAX_RETRIES})`);
        setTimeout(attemptConnection, delay);
      } else {
        console.error(`🚨 Fatal MongoDB Error: Max retries (${MAX_RETRIES}) reached. Application will continue but database is unavailable.`);
      }
    }
  };

  // Add event listeners for comprehensive connection logging
  mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB Disconnected. Mongoose will attempt to reconnect automatically.');
  });
  
  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB Reconnected successfully.');
  });
  
  mongoose.connection.on('error', (err) => {
    console.error(`❌ MongoDB Runtime Error: ${err.message}`);
  });

  await attemptConnection();
};

export default connectDB;