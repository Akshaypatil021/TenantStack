import { Router } from 'express';
import {
  createProject,
  getProjects,
  inviteToProject,
  getProjectInvitation,
  acceptProjectInvite,
  getProjectMembers,
  removeMember,
  revokeProjectInvitation,
} from './project.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { checkResourceLimit } from '../../middleware/limit.middleware';
import { checkProjectAccess } from '../../middleware/projectAccess.middleware';

const router = Router();

// ─── Project CRUD (existing, secured) ───
router.post('/', authenticate, requirePermission('project:create'), checkResourceLimit('projects'), createProject);
router.get('/', authenticate, requirePermission('project:read'), getProjects);

// ─── Public Invitation Routes (for the invitee) ───
// IMPORTANT: These MUST come before /:projectId routes to avoid "invite" being matched as a projectId

// Get invitation details by token (Public - invitee clicks the link)
router.get('/invite/:token', getProjectInvitation);

// Accept an invitation (Public - invitee submits the form)
router.post('/invite/:token/accept', acceptProjectInvite);

// ─── Project Collaboration (Authenticated) ───

// Invite a user to a project (Only OWNER/ADMIN)
router.post(
  '/:projectId/invite',
  authenticate,
  checkProjectAccess(['OWNER', 'ADMIN']),
  inviteToProject
);

// Get all members of a project (Any project member)
router.get(
  '/:projectId/members',
  authenticate,
  checkProjectAccess(),
  getProjectMembers
);

// Remove a member from a project (Only OWNER/ADMIN)
router.delete(
  '/:projectId/members/:memberId',
  authenticate,
  checkProjectAccess(['OWNER', 'ADMIN']),
  removeMember
);

// Revoke a pending invitation (Only OWNER/ADMIN)
router.delete(
  '/:projectId/invitations/:invitationId',
  authenticate,
  checkProjectAccess(['OWNER', 'ADMIN']),
  revokeProjectInvitation
);

export default router;
