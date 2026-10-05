import express from 'express';
import { getActivities } from './activity.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = express.Router();

router.get('/', authenticate, getActivities);

export default router;
