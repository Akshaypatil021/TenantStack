import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import User from '../users/user.model';
import Tenant from '../tenants/tenant.model';
import Invoice from '../subscriptions/invoice.model';
import PaidUser from '../payments/paidUser.model';
import Ec2Host from '../compute/ec2Host.model';
import ComputeInstance from '../compute/compute.model';
import StorageConfig from '../storage/storageConfig.model';
import StorageObject from '../storage/storage.model';
import { S3Service } from '../../services/s3.service';
import { getOrCreateMasterHost } from '../compute/compute.controller';

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
      pendingApprovals,
      totalInvoices,
      suspendedTenants,
      failedInvoices,
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
      PaidUser.countDocuments({ status: 'PENDING_APPROVAL' }),
      Invoice.countDocuments(),
      Tenant.countDocuments({ status: 'SUSPENDED' }),
      Invoice.countDocuments({ status: 'FAILED' }),
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
        suspendedTenants,
        totalPaidUsers,
        pendingApprovals,
        failedInvoices,
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
    if (status && status !== 'ALL') query.status = status;

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

    // If tenant exists and was in PENDING state, update to INACTIVE
    if (paidUser.tenantId) {
      const tenant = await Tenant.findById(paidUser.tenantId);
      if (tenant && tenant.status === 'PENDING') {
        tenant.status = 'INACTIVE';
        await tenant.save();
      }
    }

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

/**
 * Helper: Get or Initialize Super Admin S3 Storage Configuration
 */
export const getOrCreateStorageConfig = async () => {
  let config = await StorageConfig.findOne({ isDefault: true });
  if (!config) {
    config = await StorageConfig.create({
      provider: 'AWS_S3',
      bucketName: process.env.S3_BUCKET_NAME || 'tenantstack-storage',
      region: process.env.AWS_REGION || 'ap-south-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      status: (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_ACCESS_KEY_ID.length > 8) ? 'connected' : 'not_configured',
      isDefault: true,
      notes: 'Master AWS S3 Cloud Storage configuration managed by Super Admin',
    });
  }
  return config;
};

/**
 * 8. Consolidated Admin Resources & Telemetry Overview
 * GET /api/v1/admin/resources
 */
export const getAdminResources = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [masterHost, storageConfig, totalInstances, runningInstances, totalStorageObjects, storageSizeAgg, totalTenants, hostedInstances] =
      await Promise.all([
        getOrCreateMasterHost(),
        getOrCreateStorageConfig(),
        ComputeInstance.countDocuments({ status: { $ne: 'terminated' } }),
        ComputeInstance.countDocuments({ status: 'running' }),
        StorageObject.countDocuments(),
        StorageObject.aggregate([{ $group: { _id: null, totalBytes: { $sum: '$fileSizeBytes' } } }]),
        Tenant.countDocuments({ status: 'ACTIVE' }),
        ComputeInstance.find({ status: { $ne: 'terminated' } })
          .populate('tenantId', 'name subdomain plan')
          .sort({ updatedAt: -1 })
          .limit(25)
          .lean(),
      ]);

    const totalStorageBytes = storageSizeAgg.length > 0 ? storageSizeAgg[0].totalBytes : 0;
    const totalStorageMB = Number((totalStorageBytes / (1024 * 1024)).toFixed(2));

    res.status(200).json({
      success: true,
      ec2Host: {
        _id: masterHost._id,
        label: masterHost.label,
        hostIp: masterHost.hostIp,
        sshUsername: masterHost.sshUsername,
        hasSshKey: !!masterHost.sshKey,
        region: masterHost.region,
        status: masterHost.status,
        basePort: masterHost.basePort,
        totalAppsHosted: totalInstances,
        lastCheckedAt: masterHost.lastCheckedAt,
        notes: masterHost.notes,
      },
      storageConfig: {
        _id: storageConfig._id,
        provider: storageConfig.provider,
        bucketName: storageConfig.bucketName,
        region: storageConfig.region,
        accessKeyId: storageConfig.accessKeyId,
        hasSecretKey: !!storageConfig.secretAccessKey,
        secretAccessKeyMasked: storageConfig.secretAccessKey ? '••••••••••••••••' : '',
        status: storageConfig.status,
        lastTestedAt: storageConfig.lastTestedAt,
        testMessage: storageConfig.testMessage,
        notes: storageConfig.notes,
      },
      telemetry: {
        totalInstances,
        runningInstances,
        totalStorageObjects,
        totalStorageBytes,
        totalStorageMB,
        totalTenants,
      },
      instances: hostedInstances,
    });
  } catch (error: any) {
    console.error('Error fetching admin resources:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch admin resources' });
  }
};

/**
 * 9. Get S3 Storage Configuration
 * GET /api/v1/admin/storage-config
 */
export const getAdminStorageConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const config = await getOrCreateStorageConfig();
    res.status(200).json({
      success: true,
      storageConfig: {
        _id: config._id,
        provider: config.provider,
        bucketName: config.bucketName,
        region: config.region,
        accessKeyId: config.accessKeyId,
        hasSecretKey: !!config.secretAccessKey,
        secretAccessKeyMasked: config.secretAccessKey ? '••••••••••••••••' : '',
        status: config.status,
        lastTestedAt: config.lastTestedAt,
        testMessage: config.testMessage,
        notes: config.notes,
      },
    });
  } catch (error: any) {
    console.error('Error getting storage config:', error);
    res.status(500).json({ error: error.message || 'Failed to get storage configuration' });
  }
};

/**
 * 10. Update S3 Storage Configuration
 * PUT /api/v1/admin/storage-config
 */
export const updateAdminStorageConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { provider, bucketName, region, accessKeyId, secretAccessKey, notes } = req.body;

    let config = await StorageConfig.findOne({ isDefault: true });
    if (!config) {
      config = new StorageConfig({ isDefault: true });
    }

    if (provider) config.provider = provider;
    if (bucketName) config.bucketName = bucketName.trim();
    if (region) config.region = region.trim();
    if (accessKeyId !== undefined) config.accessKeyId = accessKeyId.trim();
    
    // Only update secret key if provided and not the masked placeholder
    if (secretAccessKey && secretAccessKey !== '••••••••••••••••') {
      config.secretAccessKey = secretAccessKey.trim();
    }

    if (notes !== undefined) config.notes = notes.trim();

    await config.save();

    // Propagate to runtime S3Service
    S3Service.setRuntimeConfig({
      bucketName: config.bucketName,
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      provider: config.provider as any,
    });

    res.status(200).json({
      success: true,
      message: 'AWS S3 Cloud Storage configuration saved successfully.',
      storageConfig: {
        _id: config._id,
        provider: config.provider,
        bucketName: config.bucketName,
        region: config.region,
        accessKeyId: config.accessKeyId,
        hasSecretKey: !!config.secretAccessKey,
        secretAccessKeyMasked: config.secretAccessKey ? '••••••••••••••••' : '',
        status: config.status,
        lastTestedAt: config.lastTestedAt,
        notes: config.notes,
      },
    });
  } catch (error: any) {
    console.error('Error updating storage config:', error);
    res.status(500).json({ error: error.message || 'Failed to update storage configuration' });
  }
};

/**
 * 11. Test S3 Bucket Connection
 * POST /api/v1/admin/storage-config/test
 */
export const testAdminStorageConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bucketName, region, accessKeyId, secretAccessKey } = req.body || {};

    const config = await getOrCreateStorageConfig();

    // Use passed credentials or fall back to stored credentials
    const testBucket = bucketName?.trim() || config.bucketName;
    const testRegion = region?.trim() || config.region;
    const testAccessKey = accessKeyId?.trim() || config.accessKeyId;
    const testSecretKey =
      secretAccessKey && secretAccessKey !== '••••••••••••••••'
        ? secretAccessKey.trim()
        : config.secretAccessKey;

    const result = await S3Service.testConnection({
      bucketName: testBucket,
      region: testRegion,
      accessKeyId: testAccessKey,
      secretAccessKey: testSecretKey,
    });

    config.status = result.success ? 'connected' : 'error';
    config.lastTestedAt = new Date();
    config.testMessage = result.message;
    await config.save();

    res.status(200).json({
      success: result.success,
      message: result.message,
      latencyMs: result.latencyMs,
      bucket: result.bucket || testBucket,
      region: result.region || testRegion,
      status: config.status,
    });
  } catch (error: any) {
    console.error('Error testing S3 configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test S3 bucket connection',
    });
  }
};

