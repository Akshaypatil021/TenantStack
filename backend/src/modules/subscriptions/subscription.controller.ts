import { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Tenant from '../tenants/tenant.model';
import User from '../users/user.model';
import Project from '../projects/project.model';
import StorageModel from '../storage/storage.model';
import Subscription from './subscription.model';
import Invoice from './invoice.model';
import { PLAN_CONFIG, resolveWorkspacePlanName, getPlanLimits } from '../../config/plan.config';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { getOrSetCache, invalidateCache } from '../../services/redis.service';

const UpgradeSchema = z.object({
  newPlan: z.enum(['Starter Dev', 'Solo Dev', 'Pro Dev', 'FREE', 'PRO', 'BUSINESS']),
});

const PLAN_PRICES: Record<string, number> = {
  'Starter Dev': 5,
  'Solo Dev': 15,
  'Pro Dev': 35,
  FREE: 0,
  PRO: 15,
  BUSINESS: 35,
};

export const getCurrentSubscription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.user!;

    // Cache the full subscription response for 60 seconds
    const { data: subscriptionData, isCached } = await getOrSetCache(
      `tenant:${tenantId}:subscription`,
      60,
      async () => {
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) return null;

        const planName = resolveWorkspacePlanName(tenant.subscriptionPlan, tenant.storagePlan);
        const planLimits = PLAN_CONFIG[planName] || PLAN_CONFIG['Starter Dev'];

        const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
        const [projectsCount, usersCount, storageResult] = await Promise.all([
          Project.countDocuments({ tenantId }),
          User.countDocuments({ tenantId }),
          StorageModel.aggregate([
            { $match: { tenantId: tenantObjectId } },
            { $group: { _id: null, totalBytes: { $sum: '$fileSizeBytes' } } },
          ]),
        ]);

        const currentBytes = storageResult.length > 0 ? storageResult[0].totalBytes : 0;
        const currentMB = Number((currentBytes / (1024 * 1024)).toFixed(2));

        const subscription = await Subscription.findOne({ tenantId });

        return {
          plan: planName,
          status: subscription?.status || 'ACTIVE',
          usage: {
            projects: {
              used: projectsCount,
              max: planLimits.maxProjects,
              isUnlimited: planLimits.maxProjects === -1,
            },
            users: {
              used: usersCount,
              max: planLimits.maxUsers,
            },
            storageMB: {
              used: currentMB,
              max: planLimits.maxStorageMB,
            },
            apiRequestsPerDay: {
              used: tenant.apiRequests || 0,
              max: planLimits.maxApiRequestsPerDay,
            },
          },
        };
      }
    );

    if (!subscriptionData) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    res.setHeader('X-Cache-Status', isCached ? 'HIT' : 'MISS');
    res.status(200).json(subscriptionData);
  } catch (error: any) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const upgradePlan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.user!;
    const { newPlan } = UpgradeSchema.parse(req.body);

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    if (tenant.subscriptionPlan === newPlan) {
      res.status(400).json({ error: `Your organization is already on the ${newPlan} plan.` });
      return;
    }

    const price = PLAN_PRICES[newPlan] ?? 0;
    const transactionId = `txn_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Create Invoice Record
    const invoice = await Invoice.create({
      tenantId,
      plan: newPlan,
      amount: price,
      currency: 'USD',
      transactionId,
      status: 'PAID',
    });

    // 2. Update Tenant Plan
    tenant.subscriptionPlan = newPlan;
    tenant.storagePlan = newPlan;
    await tenant.save();

    // 3. Update or Create Subscription Record
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // Valid for 30 days

    await Subscription.findOneAndUpdate(
      { tenantId },
      {
        plan: newPlan,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate,
      },
      { upsert: true, new: true }
    );

    // 4. INVALIDATE all tenant-related caches so new plan takes effect immediately
    await Promise.all([
      invalidateCache(`tenant:${tenantId}:plan`),
      invalidateCache(`tenant:${tenantId}:subscription`),
      invalidateCache(`tenant:${tenantId}:storage`),
      invalidateCache(`tenant:${tenantId}:projects:count`),
      invalidateCache(`tenant:${tenantId}:users:count`),
    ]);

    res.status(200).json({
      message: `Successfully upgraded to ${newPlan} plan!`,
      plan: newPlan,
      transactionId,
      invoice,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation Error', details: error.issues });
    } else {
      console.error('Upgrade plan error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

export const getInvoices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.user!;
    const invoices = await Invoice.find({ tenantId }).sort({ createdAt: -1 });

    res.status(200).json({ count: invoices.length, invoices });
  } catch (error: any) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
