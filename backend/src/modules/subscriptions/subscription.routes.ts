import { Router } from 'express';
import { getCurrentSubscription, upgradePlan, getInvoices } from './subscription.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

// Secure all subscription routes with auth middleware
router.use(authenticate);

router.get('/current', getCurrentSubscription);
router.post('/upgrade', requirePermission('billing:update'), upgradePlan);
router.get('/invoices', requirePermission('billing:read'), getInvoices);

export default router;
