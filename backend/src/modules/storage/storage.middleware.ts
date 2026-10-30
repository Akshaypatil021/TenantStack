import multer from 'multer';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import Tenant from '../tenants/tenant.model';
import StorageModel from './storage.model';
import { PLAN_CONFIG, resolveWorkspacePlanName } from '../../config/plan.config';
import mongoose from 'mongoose';

// Memory storage so we have access to req.file.buffer for S3 and size validation before any S3 push
export const storageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max per file
  },
});

/**
 * Hard Quota Enforcement Middleware:
 * Calculates total tenant storage consumed in S3.
 * If (currentUsedMB + incomingFileMB) > planLimit:
 * Blocks the upload with HTTP 403.
 * Returns { error: "Your storage limit is exceeded. Please upgrade your plan to get more storage.", currentMB, maxMB, upgradeRequired: true }
 */
export const checkStorageQuota = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file provided for upload' });
      return;
    }

    const { tenantId } = req.user;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }

    // 1. Fetch Tenant and Plan limits
    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    const planName = resolveWorkspacePlanName(tenant.subscriptionPlan, tenant.storagePlan);
    const planLimits = PLAN_CONFIG[planName] || PLAN_CONFIG['Starter Dev'];

    // 2. Calculate current storage consumed by this tenant in StorageModel
    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
    const result = await StorageModel.aggregate([
      { $match: { tenantId: tenantObjectId } },
      { $group: { _id: null, totalBytes: { $sum: '$fileSizeBytes' } } },
    ]);

    const currentBytes = result.length > 0 ? result[0].totalBytes : 0;
    const currentMB = Number((currentBytes / (1024 * 1024)).toFixed(2));
    const incomingFileMB = Number((req.file.size / (1024 * 1024)).toFixed(2));
    const maxMB = planLimits.maxStorageMB;

    // 3. Enforce quota: if (currentUsedMB + incomingFileMB) > planLimit
    if (maxMB !== -1 && currentMB + incomingFileMB > maxMB) {
      res.status(403).json({
        error: 'Your storage limit is exceeded. Please upgrade your plan to get more storage.',
        currentMB,
        incomingFileMB,
        maxMB,
        upgradeRequired: true,
        plan: planName,
      });
      return;
    }

    // Store computed metrics on request object for downstream controller use
    (req as any).storageMetrics = {
      currentMB,
      incomingFileMB,
      maxMB,
      planName,
    };

    next();
  } catch (error: any) {
    console.error('Storage quota check error:', error);
    res.status(500).json({ error: 'Internal Server Error verifying storage quota' });
  }
};
