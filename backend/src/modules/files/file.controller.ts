import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { FileModel } from './file.model';
import Project from '../projects/project.model';
import Tenant from '../tenants/tenant.model';
import { PLAN_CONFIG } from '../../config/plan.config';
import { StorageService } from '../../services/storage.service';
import { getOrSetCache, invalidateCache } from '../../services/redis.service';

/**
 * Upload a file to a project
 */
export const uploadFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Verify project belongs to tenant
    const project = await Project.findOne({ _id: projectId, tenantId: req.user.tenantId });
    if (!project) {
      // Clean up uploaded file if project not found
      StorageService.deleteFile(file.path);
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const fileSizeBytes = file.size;
    const fileSizeMB = Number((fileSizeBytes / (1024 * 1024)).toFixed(4));

    // Construct relative path for client access
    const relativePath = file.path.replace(process.cwd(), '').replace(/\\/g, '/');

    const fileDoc = await FileModel.create({
      tenantId: req.user.tenantId,
      projectId: project._id,
      originalName: file.originalname,
      fileName: file.filename,
      filePath: relativePath,
      fileSizeBytes,
      fileSizeMB,
      mimeType: file.mimetype,
      uploadedBy: req.user.userId,
    });

    // Invalidate storage cache so usage meter updates immediately
    await invalidateCache(`tenant:${req.user.tenantId}:storage`);

    res.status(201).json({
      message: 'File uploaded successfully',
      file: fileDoc,
    });
  } catch (error: any) {
    console.error('File Upload Error:', error);
    if (req.file) {
      StorageService.deleteFile(req.file.path);
    }
    res.status(500).json({ error: 'Internal Server Error during file upload' });
  }
};

/**
 * Get all files for a specific project (Tenant isolated)
 */
export const getProjectFiles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId } = req.params;

    const files = await FileModel.find({
      tenantId: req.user.tenantId,
      projectId,
    })
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'firstName lastName email');

    res.status(200).json({ files });
  } catch (error: any) {
    console.error('Get Project Files Error:', error);
    res.status(500).json({ error: 'Internal Server Error fetching files' });
  }
};

/**
 * Delete a file (Tenant isolated)
 */
export const deleteFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { fileId } = req.params;

    const file = await FileModel.findOne({
      _id: fileId,
      tenantId: req.user.tenantId,
    });

    if (!file) {
      res.status(404).json({ error: 'File not found or access denied' });
      return;
    }

    // Delete physical file from disk
    const absolutePath = file.filePath.startsWith('/')
      ? process.cwd() + file.filePath
      : process.cwd() + '/' + file.filePath;

    StorageService.deleteFile(absolutePath);

    // Delete record from database
    await file.deleteOne();

    // Invalidate storage cache so freed space reflects immediately
    await invalidateCache(`tenant:${req.user.tenantId}:storage`);

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error: any) {
    console.error('Delete File Error:', error);
    res.status(500).json({ error: 'Internal Server Error deleting file' });
  }
};

/**
 * Get tenant storage usage summary
 */
export const getStorageUsage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = req.user.tenantId;

    // Cache storage usage for 60 seconds
    const { data: storageData, isCached } = await getOrSetCache(
      `tenant:${tenantId}:storage`,
      60,
      async () => {
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) return null;

        const planName = (tenant.subscriptionPlan || 'FREE') as 'FREE' | 'PRO' | 'BUSINESS';
        const planLimits = PLAN_CONFIG[planName] || PLAN_CONFIG.FREE;

        const result = await FileModel.aggregate([
          { $match: { tenantId: tenant._id } },
          { $group: { _id: null, totalBytes: { $sum: '$fileSizeBytes' }, totalFiles: { $sum: 1 } } },
        ]);

        const totalBytes = result.length > 0 ? result[0].totalBytes : 0;
        const totalFiles = result.length > 0 ? result[0].totalFiles : 0;
        const usedMB = Number((totalBytes / (1024 * 1024)).toFixed(2));

        return {
          plan: planName,
          usedMB,
          maxStorageMB: planLimits.maxStorageMB,
          totalFiles,
          percentUsed: Math.min(100, Math.round((usedMB / planLimits.maxStorageMB) * 100)),
        };
      }
    );

    if (!storageData) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    res.setHeader('X-Cache-Status', isCached ? 'HIT' : 'MISS');
    res.status(200).json(storageData);
  } catch (error: any) {
    console.error('Get Storage Usage Error:', error);
    res.status(500).json({ error: 'Internal Server Error fetching storage usage' });
  }
};
