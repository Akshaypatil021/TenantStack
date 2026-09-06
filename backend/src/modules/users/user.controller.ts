import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { z } from 'zod';
import Invitation from './invitation.model';
import User from './user.model';
import Role from '../roles/role.model';
import Tenant from '../tenants/tenant.model';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendInvitationEmail } from '../../services/email.service';
import { generateToken } from '../../utils/jwt.util';

const InviteSchema = z.object({
  email: z.string().email(),
  roleName: z.string().min(1),
});

const AcceptInviteSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  password: z.string().min(6),
});

export const inviteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { tenantId } = req.user;
    const validatedData = InviteSchema.parse(req.body);

    // Check if user already exists in this tenant
    const existingUser = await User.findOne({ tenantId, email: validatedData.email });
    if (existingUser) {
      res.status(400).json({ error: 'User already exists in this organization' });
      return;
    }

    // Verify role belongs to tenant by name
    const role = await Role.findOne({ name: validatedData.roleName, tenantId });
    if (!role) {
      res.status(400).json({ error: `Role '${validatedData.roleName}' not found` });
      return;
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Save invitation
    await Invitation.create({
      tenantId,
      email: validatedData.email,
      roleId: role._id,
      token,
      expiresAt,
      status: 'PENDING',
    });

    // Send email
    await sendInvitationEmail(validatedData.email, token, tenant.name);

    res.status(200).json({ message: 'Invitation sent successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation Error', details: error.issues });
    } else {
      console.error('Invite error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

export const getInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    const invitation = await Invitation.findOne({ token, status: 'PENDING' })
      .populate('tenantId', 'name')
      .populate('roleId', 'name');

    if (!invitation) {
      res.status(404).json({ error: 'Invalid or expired invitation link' });
      return;
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'EXPIRED';
      await invitation.save();
      res.status(400).json({ error: 'Invitation has expired' });
      return;
    }

    res.status(200).json({
      email: invitation.email,
      tenant: invitation.tenantId,
      role: invitation.roleId,
    });
  } catch (error) {
    console.error('Get invitation error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const acceptInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const validatedData = AcceptInviteSchema.parse(req.body);

    const invitation = await Invitation.findOne({ token, status: 'PENDING' });
    if (!invitation || new Date() > invitation.expiresAt) {
      res.status(400).json({ error: 'Invalid or expired invitation link' });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validatedData.password, salt);

    // Create user
    const user = await User.create({
      tenantId: invitation.tenantId,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: invitation.email, // from invitation
      passwordHash,
      roleId: invitation.roleId,
    });

    // Mark invitation as accepted
    invitation.status = 'ACCEPTED';
    await invitation.save();

    // Fetch role name for JWT/response
    const role = await Role.findById(invitation.roleId);

    // Generate JWT
    const jwtToken = generateToken({
      userId: user._id.toString(),
      tenantId: user.tenantId.toString(),
      roleId: user.roleId.toString(),
    });

    res.status(200).json({
      message: 'Invitation accepted successfully',
      token: jwtToken,
      user: { id: user._id, email: user.email, firstName: user.firstName, role: role?.name },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation Error', details: error.issues });
    } else {
      console.error('Accept invite error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};
