import multer from 'multer';
import path from 'path';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import Tenant from '../modules/tenants/tenant.model';
import { FileModel } from '../modules/files/file.model';
import { PLAN_CONFIG } from '../config/plan.config';
import { StorageService } from '../services/storage.service';
import { getOrSetCache } from '../services/redis.service';

const storage = multer.diskStorage({
  destination: (req: any, _file, cb) => {
    const tenantId = req.user?.tenantId?.toString() || 'default';
    const projectId = req.params?.projectId || 'general';
    const targetDir = StorageService.getTenantDirectory(tenantId, projectId);
    cb(null, targetDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${baseName}_${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max single file cap
});

/**
 * Middleware to check storage quota before processing upload
 * Uses Redis cache for tenant plan lookup to reduce DB overhead.
 */
export const checkStorageLimit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { tenantId } = req.user;

    // Fetch tenant plan from cache (5 min TTL)
    const { data: tenantData } = await getOrSetCache(
      `tenant:${tenantId}:plan`,
      300,
      async () => {
        const tenant = await Tenant.findById(tenantId).lean();
        if (!tenant) return null;
        return { plan: tenant.subscriptionPlan || 'FREE', _id: tenant._id };
      }
    );

    if (!tenantData) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    const planName = tenantData.plan as 'FREE' | 'PRO' | 'BUSINESS';
    const planLimits = PLAN_CONFIG[planName] || PLAN_CONFIG.FREE;

    // Calculate current storage consumed by this tenant across all files
    // (Not cached here because we need real-time accuracy before accepting uploads)
    const result = await FileModel.aggregate([
      { $match: { tenantId: tenantData._id } },
      { $group: { _id: null, totalBytes: { $sum: '$fileSizeBytes' } } },
    ]);

    const totalBytes = result.length > 0 ? result[0].totalBytes : 0;
    const totalMB = totalBytes / (1024 * 1024);

    if (planLimits.maxStorageMB !== -1 && totalMB >= planLimits.maxStorageMB) {
      res.status(403).json({
        error: `Storage quota exceeded for ${planName} plan limit (${planLimits.maxStorageMB} MB). Please upgrade your subscription plan.`,
        plan: planName,
        currentStorageMB: Number(totalMB.toFixed(2)),
        maxStorageMB: planLimits.maxStorageMB,
      });
      return;
    }

    next();
  } catch (error: any) {
    console.error('Storage Limit Check Error:', error);
    res.status(500).json({ error: 'Internal Server Error checking storage quota' });
  }
};
