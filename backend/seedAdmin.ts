import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './src/modules/users/user.model';
import Role from './src/modules/roles/role.model';
import { connectDB } from './src/config/database';

async function seed() {
  await connectDB();
  
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
    console.log('Admin user updated');
  }
  process.exit(0);
}

seed();
