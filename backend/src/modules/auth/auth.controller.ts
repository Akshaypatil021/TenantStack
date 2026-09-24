import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import Tenant from '../tenants/tenant.model';
import User from '../users/user.model';
import Role from '../roles/role.model';
import Permission from '../permissions/permission.model';
import { generateToken } from '../../utils/jwt.util';

const RegisterSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  developerRole: z.string().min(2),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate Input
    const validatedData = RegisterSchema.parse(req.body);

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    // 3. Get or Create Platform User Role
    let platformRole = await Role.findOne({ name: 'Platform User', tenantId: { $exists: false } });
    if (!platformRole) {
      platformRole = await Role.create({
        name: 'Platform User',
        description: 'Default role for a newly registered user without a tenant',
        isDefault: true,
      });
    }

    // 4. Hash Password & Create User
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validatedData.password, salt);

    const user = await User.create({
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: validatedData.email,
      passwordHash,
      developerRole: validatedData.developerRole,
      roleId: platformRole._id,
    });

    // 5. Generate JWT
    const token = generateToken({
      userId: user._id.toString(),
      roleId: platformRole._id.toString(),
    });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, developerRole: user.developerRole }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation Error', details: error.issues });
    } else {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate Input
    const validatedData = LoginSchema.parse(req.body);

    // 2. Find User
    const user = await User.findOne({ email: validatedData.email });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // 3. Compare Password
    const isMatch = await bcrypt.compare(validatedData.password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // 4. Generate JWT
    const token = generateToken({
      userId: user._id.toString(),
      roleId: user.roleId.toString(),
      ...(user.tenantId && { tenantId: user.tenantId.toString() }),
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user._id, email: user.email, firstName: user.firstName }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation Error', details: error.issues });
    } else {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};
