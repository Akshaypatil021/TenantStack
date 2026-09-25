import { Router } from 'express';
import { createPaymentOrder, verifyPayment, getPaidUsers, getMySubscriptions } from './payment.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// Protect payment routes with JWT authentication
router.use(authenticate);

// 1. Create order
router.post('/create-order', createPaymentOrder);

// 2. Verify payment signature and allocate resources
router.post('/verify', verifyPayment);

// 3. Get all paid users
router.get('/paid-users', getPaidUsers);

// 4. Get current user's active subscriptions & tiers
router.get('/my-subscriptions', getMySubscriptions);

export default router;
