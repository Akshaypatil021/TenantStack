import app from './app';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

import { connectDB } from './config/database';
import { initRedis } from './services/redis.service';
import { S3Service } from './services/s3.service';
import User from './modules/users/user.model';
import Role from './modules/roles/role.model';
import bcrypt from 'bcrypt';

const PORT = process.env.PORT || 5000;

const seedAdminUser = async () => {
  let adminRole = await Role.findOne({ name: 'Platform Admin' });
  if (!adminRole) {
    adminRole = await Role.create({
      name: 'Platform Admin',
      description: 'Super admin',
      isDefault: false
    });
  }

  const existingAdmin = await User.findOne({ email: 'admin@gmail.com' });
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('1234', salt);
  
  if (!existingAdmin) {
    await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@gmail.com',
      passwordHash,
      developerRole: 'Admin',
      roleId: adminRole._id
    });
    console.log('Admin user created');
  } else {
    existingAdmin.passwordHash = passwordHash;
    existingAdmin.roleId = adminRole._id;
    await existingAdmin.save();
    console.log('Admin user verified');
  }
};

const startServer = async () => {
  try {
    // Database connection
    await connectDB();
    
    // Seed Admin User
    await seedAdminUser();

    // Initialize S3 Storage runtime config from DB
    await S3Service.initFromDb();

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
