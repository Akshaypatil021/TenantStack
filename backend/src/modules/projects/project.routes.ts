import { Router } from 'express';
import { createProject, getProjects } from './project.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// Secure all project routes with the auth middleware
router.use(authenticate);

router.post('/', createProject);
router.get('/', getProjects);

export default router;
