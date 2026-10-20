import { Router } from 'express';
import {
  getAdminStats,
  getAllUsers,
  getAllTenants,
  getAllSubscriptions,
  getAllInvoices,
  approveSubscription,
  declineSubscription,
  getAdminResources,
  getAdminStorageConfig,
  updateAdminStorageConfig,
  testAdminStorageConfig,
} from './admin.controller';
import {
  getAdminEc2Host,
  updateAdminEc2Host,
  testAdminEc2Host,
} from '../compute/compute.controller';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { Response, NextFunction } from 'express';
import User from '../users/user.model';

const router = Router();

// Middleware to enforce admin access
const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const user = await User.findById(req.user.userId);
    if (!user || user.email !== 'admin@gmail.com') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

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

// Compute & S3 Storage Resources Management
router.get('/resources', getAdminResources);
router.get('/storage-config', getAdminStorageConfig);
router.put('/storage-config', updateAdminStorageConfig);
router.post('/storage-config/test', testAdminStorageConfig);

// Master AWS EC2 Host Configuration
router.get('/ec2-host', getAdminEc2Host);
router.put('/ec2-host', updateAdminEc2Host);
router.post('/ec2-host/test', testAdminEc2Host);

export default router;
