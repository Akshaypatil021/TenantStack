import { Router } from 'express';
import { createProject, getProjects } from './project.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { checkResourceLimit } from '../../middleware/limit.middleware';

const router = Router();

// Secure all project routes with the auth middleware
router.use(authenticate);

router.post('/', requirePermission('project:create'), checkResourceLimit('projects'), createProject);
router.get('/', requirePermission('project:read'), getProjects);

export default router;
