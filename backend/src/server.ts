import app from './app';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

import { connectDB } from './config/database';
import { initRedis } from './services/redis.service';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Database connection
    await connectDB();

    // Redis Cache connection (graceful - server runs even if Redis fails)
    initRedis();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
