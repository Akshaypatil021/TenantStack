import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { inviteUser, getInvitation, acceptInvitation } from './user.controller';

const router = Router();

// Only users with 'user:create' permission (like Tenant Admin) can invite
router.post('/invite', authenticate, requirePermission('user:create'), inviteUser);

// Public routes for the invitee to fetch invite details and accept
router.get('/invite/:token', getInvitation);
router.post('/invite/:token/accept', acceptInvitation);

export default router;
