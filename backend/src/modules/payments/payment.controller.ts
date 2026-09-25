import { Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import User from '../users/user.model';
import Tenant from '../tenants/tenant.model';
import Invoice from '../subscriptions/invoice.model';
import PaidUser from './paidUser.model';
import { generateToken } from '../../utils/jwt.util';

// Official server-side price mapping (in INR)
const PLAN_RATES_INR: Record<string, { monthly: number; yearly: number }> = {
  // Compute Plans
  'Sandbox / Testing': { monthly: 449, yearly: 3799 },
  'Dev Pro': { monthly: 1299, yearly: 10999 },
  'Compute Node': { monthly: 3499, yearly: 28999 },
  
  // Storage & Workspace Plans
  'Free Tier': { monthly: 0, yearly: 0 },
  'Solo Dev': { monthly: 449, yearly: 4299 },
  'Pro Dev': { monthly: 1299, yearly: 12999 },
};

// Plan Tier hierarchy for downgrade protection
export const PLAN_TIERS: Record<string, Record<string, number>> = {
  compute: {
    'Sandbox / Testing': 1,
    'Dev Pro': 2,
    'Compute Node': 3,
  },
  storage: {
    'Free Tier': 1,
    'Solo Dev': 2,
    'Pro Dev': 3,
  },
};

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error('Razorpay credentials not configured in environment');
  }

  return new Razorpay({
    key_id,
    key_secret,
  });
};

/**
 * 1. Create Razorpay Order
 * POST /api/v1/payments/create-order
 */
export const createPaymentOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User not found in session' });
      return;
    }

    const { planName, category = 'compute', isYearly = false } = req.body;

    if (!planName) {
      res.status(400).json({ error: 'planName is required' });
      return;
    }

    const userCategory = (category === 'storage' ? 'storage' : 'compute') as 'compute' | 'storage';
    const requestedTier = PLAN_TIERS[userCategory]?.[planName] || 1;

    // Check existing active subscription for this category
    const activePaidSub = await PaidUser.findOne({
      userId,
      category: userCategory,
      status: 'ACTIVE', 
      expiresAt: { $gt: new Date() },
    });

    if (activePaidSub) {
      const currentTier = PLAN_TIERS[userCategory]?.[activePaidSub.planName] || 1;
      const expiryFormatted = new Date(activePaidSub.expiresAt).toLocaleDateString();

      // Disallow downgrade before active plan expires
      if (requestedTier < currentTier) {
        res.status(400).json({
          error: `Cannot downgrade from ${activePaidSub.planName} to ${planName}. Your current plan is active until ${expiryFormatted}. Upgrades are permitted anytime.`,
        });
        return;
      }

      // Prevent duplicate active plan purchase
      if (requestedTier === currentTier && planName === activePaidSub.planName) {
        res.status(400).json({
          error: `You already have an active ${planName} subscription valid until ${expiryFormatted}.`,
        });
        return;
      }
    }

    const rates = PLAN_RATES_INR[planName] || { monthly: 499, yearly: 4999 };
    const priceInINR = isYearly ? rates.yearly : rates.monthly;

    // Handle Free Tier without requiring Razorpay checkout
    if (priceInINR === 0) {
      res.status(200).json({
        isFree: true,
        orderId: `free_order_${Date.now()}`,
        amount: 0,
        currency: 'INR',
        planName,
        category,
        isYearly,
      });
      return;
    }

    const razorpay = getRazorpayInstance();
    const amountInPaise = Math.round(priceInINR * 100);

    const user = await User.findById(userId);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}_${userId.substring(18)}`,
      notes: {
        userId,
        userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        userEmail: user?.email || '',
        planName,
        category,
        billing: isYearly ? 'yearly' : 'monthly',
      },
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      isFree: false,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      planName,
      category,
      isYearly,
      user: {
        name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        email: user?.email,
      },
    });
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment order' });
  }
};

/**
 * 2. Verify Razorpay Payment Signature, Provision Tenant & Allocate Resources
 * POST /api/v1/payments/verify
 */
export const verifyPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User not found in session' });
      return;
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planName,
      category = 'compute',
      isYearly = false,
      isFree = false,
      isAutoSuccess = false,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Verify signature only for standard Razorpay checkout flow (skip for free or auto-success test)
    if (!isFree && !isAutoSuccess) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        res.status(400).json({ error: 'Missing payment signature verification parameters' });
        return;
      }

      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
        return;
      }
    }

    const userCategory = (category === 'storage' ? 'storage' : 'compute') as 'compute' | 'storage';
    const requestedTier = PLAN_TIERS[userCategory]?.[planName] || 1;

    // Check existing active subscription for this category
    const activePaidSub = await PaidUser.findOne({
      userId,
      category: userCategory,
      status: 'ACTIVE',
      expiresAt: { $gt: new Date() },
    });

    if (activePaidSub) {
      const currentTier = PLAN_TIERS[userCategory]?.[activePaidSub.planName] || 1;
      const expiryFormatted = new Date(activePaidSub.expiresAt).toLocaleDateString();

      // Disallow downgrade before active plan expires
      if (requestedTier < currentTier) {
        res.status(400).json({
          error: `Cannot downgrade from ${activePaidSub.planName} to ${planName}. Your current plan is active until ${expiryFormatted}. Upgrades are permitted anytime.`,
        });
        return;
      }
    }

    // Prepare default allocated resources based on the chosen plan
    const isCompute = userCategory === 'compute';
    const cleanPlanSlug = planName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const newCategoryInstances = isCompute
      ? [
          {
            id: `node-${Date.now()}`,
            name: `${cleanPlanSlug}-server`,
            type: 'Compute',
            status: 'Running',
            ip: `192.168.1.${Math.floor(Math.random() * 200 + 20)}`,
            uptime: 'Just started',
            vCpu: planName.includes('Compute') ? 4 : planName.includes('Dev Pro') ? 2 : 1,
            ramGb: planName.includes('Compute') ? 8 : planName.includes('Dev Pro') ? 4 : 1,
            planName,
          },
        ]
      : [
          {
            id: `bucket-${Date.now()}`,
            name: `${user.firstName.toLowerCase()}-storage-bucket-01`,
            type: 'Storage',
            status: 'Running',
            ip: 's3.ap-south-1.tenantstack.cloud',
            uptime: 'Just started',
            storageGb: planName.includes('Pro') ? 50 : planName.includes('Solo') ? 15 : 1,
            planName,
          },
        ];

    // 1. Determine Payment Status
    const rates = PLAN_RATES_INR[planName] || { monthly: 0, yearly: 0 };
    const paidAmount = isYearly ? rates.yearly : rates.monthly;
    const isPaid = !isFree && paidAmount > 0;

    let tenant: any;
    if (user.tenantId) {
      tenant = await Tenant.findById(user.tenantId);
    }

    const now = new Date();
    const expiresAt = new Date(now);
    if (isYearly) {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setDate(expiresAt.getDate() + 30);
    }

    if (!isPaid) {
      // FREE TIER - auto approve and allocate
      const existingInstances = tenant?.allocatedResources?.instances || [];
      const otherCategoryInstances = existingInstances.filter((inst: any) =>
        isCompute ? inst.type !== 'Compute' : inst.type !== 'Storage'
      );
      const mergedInstances = [...otherCategoryInstances, ...newCategoryInstances];

      const currentComputePlan = isCompute ? planName : (tenant?.computePlan || tenant?.allocatedResources?.computePlan || null);
      const currentStoragePlan = !isCompute ? planName : (tenant?.storagePlan || tenant?.allocatedResources?.storagePlan || null);
      const currentComputeExpires = isCompute ? expiresAt : (tenant?.allocatedResources?.computeExpiresAt || null);
      const currentStorageExpires = !isCompute ? expiresAt : (tenant?.allocatedResources?.storageExpiresAt || null);

      let compositePlanTitle = planName;
      if (currentComputePlan && currentStoragePlan) {
        compositePlanTitle = `${currentComputePlan} & ${currentStoragePlan}`;
      } else if (currentComputePlan) {
        compositePlanTitle = currentComputePlan;
      } else if (currentStoragePlan) {
        compositePlanTitle = currentStoragePlan;
      }

      const allocatedResources = {
        ...(tenant?.allocatedResources || {}),
        instances: mergedInstances,
        computePlan: currentComputePlan,
        storagePlan: currentStoragePlan,
        computeExpiresAt: currentComputeExpires,
        storageExpiresAt: currentStorageExpires,
        lastUpdated: now,
      };

      if (!tenant) {
        const workspaceName = `${user.firstName}'s Workspace`;
        tenant = await Tenant.create({
          name: workspaceName,
          status: 'ACTIVE',
          subscriptionPlan: compositePlanTitle,
          computePlan: currentComputePlan,
          storagePlan: currentStoragePlan,
          planCategory: category,
          planBilling: isYearly ? 'yearly' : 'monthly',
          storageUsed: isCompute ? 0.8 : 1.2,
          apiRequests: 1200,
          allocatedResources,
        });
        user.tenantId = tenant._id as any;
        await user.save();
      } else {
        tenant.subscriptionPlan = compositePlanTitle;
        tenant.computePlan = currentComputePlan;
        tenant.storagePlan = currentStoragePlan;
        tenant.planCategory = category;
        tenant.planBilling = isYearly ? 'yearly' : 'monthly';
        tenant.status = 'ACTIVE';
        tenant.allocatedResources = allocatedResources;
        await tenant.save();
      }
    } else {
      // PAID TIER - requires admin approval
      if (!tenant) {
        // Create an empty tenant for the user if they don't have one
        const workspaceName = `${user.firstName}'s Workspace`;
        tenant = await Tenant.create({
          name: workspaceName,
          status: 'PENDING',
          subscriptionPlan: 'Pending Approval',
          planCategory: category,
          planBilling: isYearly ? 'yearly' : 'monthly',
          allocatedResources: { instances: [] },
        });
        user.tenantId = tenant._id as any;
        await user.save();
      }
    }

    // 2. Record Invoice
    await Invoice.create({
      tenantId: tenant._id,
      plan: planName,
      amount: paidAmount,
      currency: 'INR',
      transactionId: razorpay_payment_id || `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      status: 'PAID',
    });

    // 3. Store Paid User data
    if (isPaid) {
      await PaidUser.findOneAndUpdate(
        { userId: user._id, category: userCategory },
        {
          userId: user._id,
          tenantId: tenant._id,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          email: user.email,
          planName,
          category: userCategory,
          billing: isYearly ? 'yearly' : 'monthly',
          amountPaid: paidAmount,
          currency: 'INR',
          transactionId: razorpay_payment_id || `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          orderId: razorpay_order_id,
          paymentMethod: isAutoSuccess ? 'Razorpay Direct (Test)' : 'Razorpay Gateway',
          status: 'PENDING_APPROVAL',
          // Store what was requested so admin can approve it
          allocatedResources: {
            newInstances: newCategoryInstances,
            planName,
            isYearly,
            expiresAt
          },
          activatedAt: now,
          expiresAt,
        },
        { upsert: true, new: true }
      );
    }

    // 4. Issue fresh JWT Token containing the newly assigned tenantId
    const newToken = generateToken({
      userId: user._id.toString(),
      tenantId: tenant._id.toString(),
      roleId: user.roleId?.toString(),
    });

    res.status(200).json({
      success: true,
      message: `Payment verified! ${planName} resources allocated successfully.`,
      token: newToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        developerRole: user.developerRole,
        tenantId: tenant._id.toString(),
      },
      tenant: {
        id: tenant._id.toString(),
        name: tenant.name,
        status: tenant.status,
        subscriptionPlan: tenant.subscriptionPlan,
        computePlan: tenant.computePlan,
        storagePlan: tenant.storagePlan,
        allocatedResources: tenant.allocatedResources,
      },
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: error.message || 'Payment verification failed' });
  }
};

/**
 * 3. Get All Paid Users
 * GET /api/v1/payments/paid-users
 */
export const getPaidUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const paidUsers = await PaidUser.find()
      .populate('userId', 'firstName lastName email developerRole')
      .populate('tenantId', 'name status subscriptionPlan')
      .sort({ activatedAt: -1 });

    res.status(200).json({
      success: true,
      count: paidUsers.length,
      paidUsers,
    });
  } catch (error: any) {
    console.error('Error fetching paid users:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch paid users' });
  }
};

/**
 * 4. Get Current User Active Subscriptions & Expiry Details
 * GET /api/v1/payments/my-subscriptions
 */
export const getMySubscriptions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const subscriptions = await PaidUser.find({
      userId,
      status: 'ACTIVE',
    });

    const computeSub = subscriptions.find((s) => s.category === 'compute' && new Date(s.expiresAt) > new Date());
    const storageSub = subscriptions.find((s) => s.category === 'storage' && new Date(s.expiresAt) > new Date());

    res.status(200).json({
      success: true,
      subscriptions: {
        compute: computeSub || null,
        storage: storageSub || null,
      },
      tiers: PLAN_TIERS,
    });
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch subscriptions' });
  }
};
