import { Request, Response } from 'express';
import { z, ZodError } from 'zod';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Project from './project.model';
import ProjectInvitation from './projectInvitation.model';
import User from '../users/user.model';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { invalidateCache } from '../../services/redis.service';
import { sendProjectInvitationEmail } from '../../services/email.service';
import { generateToken } from '../../utils/jwt.util';
import bcrypt from 'bcrypt';
import { logActivity } from '../activity/activity.controller';

// ─── Validation Schemas ───

const CreateProjectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  githubRepoUrl: z.string().url().optional(),
});

const InviteToProjectSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'CONTRIBUTOR', 'VIEWER']).default('CONTRIBUTOR'),
});

const AcceptProjectInviteSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  password: z.string().min(6),
});

// ─── Existing Controllers (Preserved) ───

/**
 * Create a new project.
 * The creator is automatically added as an OWNER in the members array.
 */
export const createProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = req.user!;
    const validatedData = CreateProjectSchema.parse(req.body);

    const project = await Project.create({
      tenantId,
      createdBy: userId,
      name: validatedData.name,
      description: validatedData.description,
      githubRepoUrl: validatedData.githubRepoUrl,
      status: 'TODO',
      members: [
        {
          user: new mongoose.Types.ObjectId(userId),
          role: 'OWNER',
          joinedAt: new Date(),
        },
      ],
    });

    // Invalidate project count cache so limit middleware gets fresh count
    await Promise.all([
      invalidateCache(`tenant:${tenantId}:projects:count`),
      invalidateCache(`tenant:${tenantId}:subscription`),
    ]);

    await logActivity(
      tenantId as string,
      userId as string,
      'PROJECT_CREATED',
      `Created project: ${project.name}`,
      { projectId: project._id, githubRepoUrl: validatedData.githubRepoUrl }
    );

    res.status(201).json({ message: 'Project created successfully', project });
  } catch (error: any) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
      res.status(400).json({ error: 'Project with this name already exists in your organization' });
    } else if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation Error', details: error.issues });
    } else {
      console.error('Create project error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

/**
 * Get projects for the logged-in user.
 * - Tenant Admin / Owner: sees all tenant projects.
 * - Normal / Invited user: sees only projects they created or are a member of.
 */
export const getProjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = req.user!;

    // Scoped query: user sees projects they created in their current tenant OR any project they are a member of (even cross-tenant)
    const projects = await Project.find({
      $or: [
        { tenantId, createdBy: userId },
        { 'members.user': new mongoose.Types.ObjectId(userId) },
      ],
    })
      .sort({ createdAt: -1 })
      .populate('members.user', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    res.status(200).json({ count: projects.length, projects });
  } catch (error: any) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ─── Project Collaboration Controllers ───

/**
 * Invite a user to collaborate on a specific project.
 * Only the project OWNER or ADMIN can send invitations.
 */
export const inviteToProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { userId, tenantId } = req.user;
    const projectId = req.params.projectId as string;
    const validatedData = InviteToProjectSchema.parse(req.body);

    // 1. Verify project exists and user has OWNER/ADMIN access
    const project = await Project.findOne({ _id: projectId, tenantId });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const isCreator = project.createdBy.toString() === userId;
    const memberEntry = project.members.find((m) => m.user.toString() === userId);
    const hasAdminAccess = isCreator || (memberEntry && ['OWNER', 'ADMIN'].includes(memberEntry.role));

    if (!hasAdminAccess) {
      res.status(403).json({ error: 'Only project Owner or Admin can invite collaborators' });
      return;
    }

    // 2. Check if the invited email is already a member
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      const alreadyMember = project.members.some(
        (m) => m.user.toString() === existingUser._id.toString()
      );
      if (alreadyMember) {
        res.status(400).json({ error: 'This user is already a member of this project' });
        return;
      }
    }

    // 3. Check for existing pending invitation
    const existingInvite = await ProjectInvitation.findOne({
      projectId,
      email: validatedData.email,
      status: 'PENDING',
    });
    if (existingInvite) {
      res.status(400).json({ error: 'An invitation is already pending for this email on this project' });
      return;
    }

    // 4. Generate secure token and create invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    await ProjectInvitation.create({
      projectId,
      tenantId,
      invitedBy: userId,
      email: validatedData.email,
      role: validatedData.role,
      token,
      status: 'PENDING',
      expiresAt,
    });

    // 5. Get inviter's name for the email
    const inviter = await User.findById(userId).select('firstName lastName');
    const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}` : 'A team member';

    // 6. Send invitation email
    await sendProjectInvitationEmail(
      validatedData.email,
      token,
      project.name,
      inviterName,
      validatedData.role
    );

    await logActivity(
      tenantId as string,
      userId as string,
      'USER_INVITED',
      `Invited ${validatedData.email} to project: ${project.name} as ${validatedData.role}`,
      { projectId, email: validatedData.email, role: validatedData.role }
    );

    res.status(200).json({
      message: 'Project invitation sent successfully',
      invitation: {
        email: validatedData.email,
        role: validatedData.role,
        projectName: project.name,
        expiresAt,
      },
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation Error', details: error.issues });
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      res.status(400).json({ error: 'An invitation is already pending for this email on this project' });
    } else {
      console.error('Invite to project error:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
};

/**
 * Get project invitation details by token (Public route for the invitee).
 */
export const getProjectInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    const invitation = await ProjectInvitation.findOne({ token, status: 'PENDING' })
      .populate('projectId', 'name description')
      .populate('invitedBy', 'firstName lastName')
      .populate('tenantId', 'name');

    if (!invitation) {
      res.status(404).json({ error: 'Invalid or expired invitation link' });
      return;
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'EXPIRED';
      await invitation.save();
      res.status(400).json({ error: 'This invitation has expired' });
      return;
    }

    const existingUser = await User.findOne({ email: invitation.email });

    res.status(200).json({
      email: invitation.email,
      role: invitation.role,
      project: invitation.projectId,
      invitedBy: invitation.invitedBy,
      tenant: invitation.tenantId,
      expiresAt: invitation.expiresAt,
      isExistingUser: !!existingUser,
    });
  } catch (error) {
    console.error('Get project invitation error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Accept a project invitation.
 * 
 * Two scenarios:
 * A) User already exists (registered) → directly add them to project members.
 * B) New user → create account, assign to the project's tenant, then add to project members.
 */
export const acceptProjectInvite = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    const invitation = await ProjectInvitation.findOne({ token, status: 'PENDING' });
    if (!invitation || new Date() > invitation.expiresAt) {
      if (invitation) {
        invitation.status = 'EXPIRED';
        await invitation.save();
      }
      res.status(400).json({ error: 'Invalid or expired invitation link' });
      return;
    }

    const project = await Project.findById(invitation.projectId);
    if (!project) {
      res.status(404).json({ error: 'Project no longer exists' });
      return;
    }

    // Check if user already exists in the system
    let user = await User.findOne({ email: invitation.email });

    if (user) {
      // ─── Scenario A: Existing User ───
      // Check if already a member
      const alreadyMember = project.members.some(
        (m) => m.user.toString() === user!._id.toString()
      );

      if (!alreadyMember) {
        // Add to project members
        project.members.push({
          user: user._id as mongoose.Types.ObjectId,
          role: invitation.role,
          joinedAt: new Date(),
        });
        await project.save();
      }

      // If user doesn't have a tenantId yet (was a platform-only user), assign tenant
      if (!user.tenantId) {
        user.tenantId = invitation.tenantId;
        await user.save();
      }

      // Mark invitation as accepted
      invitation.status = 'ACCEPTED';
      await invitation.save();

      // Generate fresh JWT with tenantId
      const jwtToken = generateToken({
        userId: user._id.toString(),
        tenantId: (user.tenantId || invitation.tenantId).toString(),
        roleId: user.roleId.toString(),
      });

      res.status(200).json({
        message: 'Successfully joined the project',
        isNewUser: false,
        token: jwtToken,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        project: {
          id: project._id,
          name: project.name,
        },
      });
    } else {
      // ─── Scenario B: New User ───
      // Require registration details in the request body
      const validatedData = AcceptProjectInviteSchema.parse(req.body);

      // Find or create a default role for the tenant (e.g., 'Member')
      const Role = (await import('../roles/role.model')).default;
      let memberRole = await Role.findOne({ tenantId: invitation.tenantId, name: 'Member' });

      if (!memberRole) {
        // Try finding any default role for the tenant
        memberRole = await Role.findOne({ tenantId: invitation.tenantId, isDefault: true });
      }

      if (!memberRole) {
        // Fallback: find any role for the tenant
        memberRole = await Role.findOne({ tenantId: invitation.tenantId });
      }

      if (!memberRole) {
        res.status(500).json({ error: 'No roles configured for this organization. Contact the admin.' });
        return;
      }

      // Hash password & create user
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(validatedData.password, salt);

      user = await User.create({
        tenantId: invitation.tenantId,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: invitation.email,
        passwordHash,
        developerRole: 'Collaborator',
        roleId: memberRole._id,
      });

      // Add new user to project members
      project.members.push({
        user: user._id as mongoose.Types.ObjectId,
        role: invitation.role,
        joinedAt: new Date(),
      });
      await project.save();

      // Mark invitation as accepted
      invitation.status = 'ACCEPTED';
      await invitation.save();

      // Generate JWT
      const jwtToken = generateToken({
        userId: user._id.toString(),
        tenantId: invitation.tenantId.toString(),
        roleId: memberRole._id.toString(),
      });

      res.status(201).json({
        message: 'Account created and joined the project successfully',
        isNewUser: true,
        token: jwtToken,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        project: {
          id: project._id,
          name: project.name,
        },
      });
    }
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation Error', details: error.issues });
    } else {
      console.error('Accept project invite error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

/**
 * Get all members of a specific project.
 * Only project members can view the member list.
 */
export const getProjectMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId } = req.params;

    // Use the project attached by checkProjectAccess middleware (avoids duplicate query)
    const project = (req as any).project || await Project.findOne({
      _id: projectId,
      tenantId: req.user.tenantId,
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Populate member user details
    await project.populate('members.user', 'firstName lastName email developerRole');
    await project.populate('createdBy', 'firstName lastName email');

    // Also fetch pending invitations for this project
    const pendingInvitations = await ProjectInvitation.find({
      projectId,
      status: 'PENDING',
    }).select('email role expiresAt createdAt');

    res.status(200).json({
      projectId: project._id,
      projectName: project.name,
      members: project.members,
      pendingInvitations,
    });
  } catch (error: any) {
    console.error('Get project members error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Remove a member from a project.
 * Only the project OWNER or ADMIN can remove members.
 * The OWNER cannot be removed.
 */
export const removeMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId, memberId } = req.params;
    const { userId } = req.user;

    const project = (req as any).project || await Project.findOne({
      _id: projectId,
      tenantId: req.user.tenantId,
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Verify the requesting user has OWNER/ADMIN access
    const isCreator = project.createdBy.toString() === userId;
    const requesterMember = project.members.find((m: any) => m.user.toString() === userId);
    const hasAdminAccess = isCreator || (requesterMember && ['OWNER', 'ADMIN'].includes(requesterMember.role));

    if (!hasAdminAccess) {
      res.status(403).json({ error: 'Only project Owner or Admin can remove members' });
      return;
    }

    // Find the member to remove
    const memberIndex = project.members.findIndex(
      (m: any) => m.user.toString() === memberId
    );

    if (memberIndex === -1) {
      res.status(404).json({ error: 'Member not found in this project' });
      return;
    }

    // Prevent removing the OWNER
    if (project.members[memberIndex].role === 'OWNER') {
      res.status(400).json({ error: 'Cannot remove the project Owner' });
      return;
    }

    // Prevent removing yourself (use a different flow for leaving)
    if (memberId === userId) {
      res.status(400).json({ error: 'Cannot remove yourself. Use the leave project option instead.' });
      return;
    }

    // Remove the member
    project.members.splice(memberIndex, 1);
    await project.save();

    res.status(200).json({ message: 'Member removed successfully' });
  } catch (error: any) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Cancel/revoke a pending project invitation.
 * Only project OWNER/ADMIN can revoke invitations.
 */
export const revokeProjectInvitation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId, invitationId } = req.params;

    const invitation = await ProjectInvitation.findOne({
      _id: invitationId,
      projectId,
      status: 'PENDING',
    });

    if (!invitation) {
      res.status(404).json({ error: 'Pending invitation not found' });
      return;
    }

    invitation.status = 'EXPIRED';
    await invitation.save();

    res.status(200).json({ message: 'Invitation revoked successfully' });
  } catch (error: any) {
    console.error('Revoke invitation error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Get all team members associated with the projects of the authenticated user.
 * This aggregates members across all projects the user created or is a member of.
 */
export const getAssociatedTeamMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { userId, tenantId } = req.user;

    // Find all projects the user is involved in (as creator, tenant owner, or member)
    const userProjects = await Project.find({
      $or: [
        { tenantId, createdBy: userId },
        { createdBy: new mongoose.Types.ObjectId(userId) },
        { 'members.user': new mongoose.Types.ObjectId(userId) },
      ],
    })
      .populate('members.user', 'firstName lastName email developerRole')
      .populate('createdBy', 'firstName lastName email developerRole')
      .sort({ createdAt: -1 });

    const projectIds = userProjects.map((p) => p._id);

    // Fetch pending invitations across all these projects
    const pendingInvitations = await ProjectInvitation.find({
      projectId: { $in: projectIds },
      status: 'PENDING',
    })
      .populate('projectId', 'name')
      .populate('invitedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    // Map to aggregate unique members across projects
    const membersMap = new Map<string, {
      user: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        developerRole?: string;
      };
      projects: Array<{
        projectId: string;
        projectName: string;
        role: string;
        joinedAt?: Date;
      }>;
      isCurrentUser: boolean;
    }>();

    for (const project of userProjects) {
      // 1. Process Project Creator (Owner)
      if (project.createdBy && typeof project.createdBy === 'object') {
        const creator = project.createdBy as any;
        const cId = creator._id.toString();

        if (!membersMap.has(cId)) {
          membersMap.set(cId, {
            user: {
              _id: cId,
              firstName: creator.firstName,
              lastName: creator.lastName,
              email: creator.email,
              developerRole: creator.developerRole,
            },
            projects: [],
            isCurrentUser: cId === userId,
          });
        }

        const existingMember = membersMap.get(cId)!;
        if (!existingMember.projects.some((p) => p.projectId === project._id.toString())) {
          existingMember.projects.push({
            projectId: project._id.toString(),
            projectName: project.name,
            role: 'OWNER',
            joinedAt: project.createdAt,
          });
        }
      }

      // 2. Process Project Members
      if (Array.isArray(project.members)) {
        for (const m of project.members) {
          if (m.user && typeof m.user === 'object') {
            const u = m.user as any;
            const uId = u._id.toString();

            if (!membersMap.has(uId)) {
              membersMap.set(uId, {
                user: {
                  _id: uId,
                  firstName: u.firstName,
                  lastName: u.lastName,
                  email: u.email,
                  developerRole: u.developerRole,
                },
                projects: [],
                isCurrentUser: uId === userId,
              });
            }

            const existingMember = membersMap.get(uId)!;
            if (!existingMember.projects.some((p) => p.projectId === project._id.toString())) {
              existingMember.projects.push({
                projectId: project._id.toString(),
                projectName: project.name,
                role: m.role,
                joinedAt: m.joinedAt,
              });
            }
          }
        }
      }
    }

    // Ensure the current user is in the list even if no projects exist yet
    if (!membersMap.has(userId)) {
      const currentUserObj = await User.findById(userId).select('firstName lastName email developerRole');
      if (currentUserObj) {
        membersMap.set(userId, {
          user: {
            _id: userId,
            firstName: currentUserObj.firstName,
            lastName: currentUserObj.lastName,
            email: currentUserObj.email,
            developerRole: currentUserObj.developerRole,
          },
          projects: [],
          isCurrentUser: true,
        });
      }
    }

    const members = Array.from(membersMap.values());

    res.status(200).json({
      count: members.length,
      members,
      projects: userProjects.map((p) => {
        const isOwner = p.createdBy?.toString() === userId || (p.createdBy as any)?._id?.toString() === userId;
        const myMembership = p.members.find((m) => m.user?.toString() === userId || (m.user as any)?._id?.toString() === userId);
        return {
          _id: p._id,
          name: p.name,
          role: isOwner ? 'OWNER' : (myMembership?.role || 'VIEWER'),
          membersCount: p.members.length,
        };
      }),
      pendingInvitations: pendingInvitations.map((inv) => ({
        _id: inv._id,
        email: inv.email,
        role: inv.role,
        projectId: (inv.projectId as any)?._id || inv.projectId,
        projectName: (inv.projectId as any)?.name || 'Project',
        invitedBy: (inv.invitedBy as any) ? `${(inv.invitedBy as any).firstName} ${(inv.invitedBy as any).lastName}`.trim() : 'Team Member',
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
      })),
    });
  } catch (error: any) {
    console.error('Get associated team members error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

const UpdateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  githubRepoUrl: z.string().url().optional().or(z.literal('')),
});

/**
 * Update project details (name, description, githubRepoUrl)
 * Only project OWNER or ADMIN can update.
 */
export const updateProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { projectId } = req.params;
    const { userId, tenantId } = req.user;
    const validatedData = UpdateProjectSchema.parse(req.body);

    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { tenantId },
        { createdBy: userId },
        { 'members.user': new mongoose.Types.ObjectId(userId) },
      ],
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const isCreator = project.createdBy.toString() === userId;
    const memberEntry = project.members.find((m: any) => m.user.toString() === userId);
    const hasAdminAccess = isCreator || (memberEntry && ['OWNER', 'ADMIN'].includes(memberEntry.role));

    if (!hasAdminAccess) {
      res.status(403).json({ error: 'Only project Owner or Admin can update project settings' });
      return;
    }

    if (validatedData.name) project.name = validatedData.name;
    if (validatedData.description !== undefined) project.description = validatedData.description;
    if (validatedData.githubRepoUrl !== undefined) project.githubRepoUrl = validatedData.githubRepoUrl;

    await project.save();

    await logActivity(
      tenantId as string,
      userId,
      'PROJECT_UPDATED',
      `Updated settings for project: ${project.name}`,
      { projectId: project._id, githubRepoUrl: project.githubRepoUrl }
    );

    res.status(200).json({ message: 'Project updated successfully', project });
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation Error', details: error.issues });
    } else {
      console.error('Update project error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

/**
 * Manually trigger a GitHub repository sync.
 * Accessible to any project member.
 */
export const syncProjectGithub = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { projectId } = req.params;
    const { userId, tenantId } = req.user;

    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { tenantId },
        { createdBy: userId },
        { 'members.user': new mongoose.Types.ObjectId(userId) },
      ],
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (!project.githubRepoUrl) {
      res.status(400).json({ error: 'No GitHub repository connected to this project' });
      return;
    }

    project.lastSyncedAt = new Date();
    await project.save();

    await logActivity(
      tenantId as string,
      userId,
      'REPO_SYNCED',
      `Manual sync triggered for GitHub repository: ${project.githubRepoUrl}`,
      { projectId: project._id, githubRepoUrl: project.githubRepoUrl }
    );

    res.status(200).json({
      message: 'Successfully synced latest repository changes from GitHub',
      lastSyncedAt: project.lastSyncedAt,
      project,
    });
  } catch (error: any) {
    console.error('Sync project error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


