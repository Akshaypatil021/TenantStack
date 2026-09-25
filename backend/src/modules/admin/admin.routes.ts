import { Router } from 'express';
import {
  getAdminStats,
  getAllUsers,
  getAllTenants,
  getAllSubscriptions,
  getAllInvoices,
  approveSubscription,
  declineSubscription,
} from './admin.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// Dashboard overview stats
router.get('/stats', getAdminStats);

// User management
router.get('/users', getAllUsers);

// Tenant management
router.get('/tenants', getAllTenants);

// Subscription management (paid users)
router.get('/subscriptions', getAllSubscriptions);
router.put('/subscriptions/:id/approve', approveSubscription);
router.put('/subscriptions/:id/decline', declineSubscription);

// Invoice / Billing history
router.get('/invoices', getAllInvoices);

export default router;
