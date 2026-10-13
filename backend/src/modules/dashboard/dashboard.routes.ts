import express from 'express';
import { getDashboardStats } from './dashboard.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = express.Router();

router.get('/stats', authenticate, getDashboardStats);

export default router;
