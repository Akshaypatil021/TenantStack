import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import Tenant from '../tenants/tenant.model';
import User from '../users/user.model';
import Role from '../roles/role.model';
import { generateToken } from '../../utils/jwt.util';

const RegisterSchema = z.object({
  companyName: z.string().min(2),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
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

    // 3. Create Tenant
    const tenant = await Tenant.create({
      name: validatedData.companyName,
      status: 'ACTIVE',
      subscriptionPlan: 'FREE',
    });

    // 4. Create Default Admin Role for the Tenant
    const adminRole = await Role.create({
      tenantId: tenant._id,
      name: 'Tenant Admin',
      description: 'Full access administrator',
      isDefault: true,
    });

    // 5. Hash Password & Create User
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validatedData.password, salt);

    const user = await User.create({
      tenantId: tenant._id,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: validatedData.email,
      passwordHash,
      roleId: adminRole._id,
    });

    // 6. Generate JWT
    const token = generateToken({
      userId: user._id.toString(),
      tenantId: tenant._id.toString(),
      roleId: adminRole._id.toString(),
    });

    res.status(201).json({
      message: 'Registration successful',
      token,
      tenant: { id: tenant._id, name: tenant.name },
      user: { id: user._id, email: user.email, firstName: user.firstName, role: adminRole.name }
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
      tenantId: user.tenantId.toString(),
      roleId: user.roleId.toString(),
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
