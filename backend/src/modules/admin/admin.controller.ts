import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import User from '../users/user.model';
import Tenant from '../tenants/tenant.model';
import Invoice from '../subscriptions/invoice.model';
import PaidUser from '../payments/paidUser.model';

/**
 * 1. Admin Dashboard Stats
 * GET /api/v1/admin/stats
 */
export const getAdminStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalTenants,
      activeTenants,
      totalPaidUsers,
      totalInvoices,
      revenueAgg,
      monthlyRevenueAgg,
      planDistribution,
      recentUsers,
      recentInvoices,
      categoryDistribution,
    ] = await Promise.all([
      User.countDocuments(),
      Tenant.countDocuments(),
      Tenant.countDocuments({ status: 'ACTIVE' }),
      PaidUser.countDocuments({ status: 'ACTIVE' }),
      Invoice.countDocuments(),
      Invoice.aggregate([
        { $match: { status: 'PAID' } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
      ]),
      Invoice.aggregate([
        { $match: { status: 'PAID' } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            revenue: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 },
      ]),
      PaidUser.aggregate([
        { $match: { status: 'ACTIVE' } },
        { $group: { _id: '$planName', count: { $sum: 1 }, revenue: { $sum: '$amountPaid' } } },
        { $sort: { count: -1 } },
      ]),
      User.find()
        .select('firstName lastName email developerRole tenantId createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Invoice.find()
        .populate('tenantId', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      PaidUser.aggregate([
        { $match: { status: 'ACTIVE' } },
        { $group: { _id: '$category', count: { $sum: 1 }, revenue: { $sum: '$amountPaid' } } },
      ]),
    ]);

    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;
    const freeUsers = totalUsers - totalPaidUsers;

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalTenants,
        activeTenants,
        totalPaidUsers,
        freeUsers,
        totalInvoices,
        totalRevenue,
        monthlyRevenue: monthlyRevenueAgg,
        planDistribution,
        categoryDistribution,
        recentUsers,
        recentInvoices,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch admin stats' });
  }
};

/**
 * 2. Get All Users (with pagination)
 * GET /api/v1/admin/users?page=1&limit=20&search=
 */
export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';

    const query: any = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash')
        .populate('tenantId', 'name status subscriptionPlan computePlan storagePlan')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
};

/**
 * 3. Get All Tenants
 * GET /api/v1/admin/tenants?page=1&limit=20
 */
export const getAllTenants = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [tenants, total] = await Promise.all([
      Tenant.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Tenant.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      tenants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch tenants' });
  }
};

/**
 * 4. Get All Subscriptions (Paid Users)
 * GET /api/v1/admin/subscriptions?page=1&limit=20&status=ACTIVE
 */
export const getAllSubscriptions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const query: any = {};
    if (status) query.status = status;

    const [subscriptions, total] = await Promise.all([
      PaidUser.find(query)
        .populate('userId', 'firstName lastName email developerRole')
        .populate('tenantId', 'name status')
        .sort({ activatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PaidUser.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch subscriptions' });
  }
};

/**
 * 5. Get All Invoices
 * GET /api/v1/admin/invoices?page=1&limit=20
 */
export const getAllInvoices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [invoices, total] = await Promise.all([
      Invoice.find()
        .populate('tenantId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch invoices' });
  }
};

/**
 * 6. Approve Subscription
 * PUT /api/v1/admin/subscriptions/:id/approve
 */
export const approveSubscription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const paidUser = await PaidUser.findById(id);

    if (!paidUser) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    if (paidUser.status === 'ACTIVE') {
      res.status(400).json({ error: 'Subscription is already active' });
      return;
    }

    const tenant = await Tenant.findById(paidUser.tenantId);
    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    // Merge allocated resources
    const newInstances = paidUser.allocatedResources?.newInstances || [];
    const isCompute = paidUser.category === 'compute';
    
    const existingInstances = tenant.allocatedResources?.instances || [];
    const otherCategoryInstances = existingInstances.filter((inst: any) =>
      isCompute ? inst.type !== 'Compute' : inst.type !== 'Storage'
    );
    
    const mergedInstances = [...otherCategoryInstances, ...newInstances];

    const currentComputePlan = isCompute ? paidUser.planName : (tenant.computePlan || tenant.allocatedResources?.computePlan || null);
    const currentStoragePlan = !isCompute ? paidUser.planName : (tenant.storagePlan || tenant.allocatedResources?.storagePlan || null);
    const currentComputeExpires = isCompute ? paidUser.expiresAt : (tenant.allocatedResources?.computeExpiresAt || null);
    const currentStorageExpires = !isCompute ? paidUser.expiresAt : (tenant.allocatedResources?.storageExpiresAt || null);

    let compositePlanTitle = paidUser.planName;
    if (currentComputePlan && currentStoragePlan) {
      compositePlanTitle = `${currentComputePlan} & ${currentStoragePlan}`;
    } else if (currentComputePlan) {
      compositePlanTitle = currentComputePlan;
    } else if (currentStoragePlan) {
      compositePlanTitle = currentStoragePlan;
    }

    tenant.subscriptionPlan = compositePlanTitle;
    tenant.computePlan = currentComputePlan;
    tenant.storagePlan = currentStoragePlan;
    tenant.planCategory = paidUser.category;
    tenant.planBilling = paidUser.billing;
    tenant.status = 'ACTIVE';
    tenant.allocatedResources = {
      ...(tenant.allocatedResources || {}),
      instances: mergedInstances,
      computePlan: currentComputePlan,
      storagePlan: currentStoragePlan,
      computeExpiresAt: currentComputeExpires,
      storageExpiresAt: currentStorageExpires,
      lastUpdated: new Date(),
    };

    await tenant.save();

    paidUser.status = 'ACTIVE';
    await paidUser.save();

    res.status(200).json({
      success: true,
      message: 'Subscription approved successfully',
      subscription: paidUser,
    });
  } catch (error: any) {
    console.error('Error approving subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to approve subscription' });
  }
};

/**
 * 7. Decline Subscription
 * PUT /api/v1/admin/subscriptions/:id/decline
 */
export const declineSubscription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const paidUser = await PaidUser.findById(id);

    if (!paidUser) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    if (paidUser.status !== 'PENDING_APPROVAL') {
      res.status(400).json({ error: 'Only pending subscriptions can be declined' });
      return;
    }

    paidUser.status = 'CANCELLED';
    await paidUser.save();

    res.status(200).json({
      success: true,
      message: 'Subscription declined successfully',
      subscription: paidUser,
    });
  } catch (error: any) {
    console.error('Error declining subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to decline subscription' });
  }
};
