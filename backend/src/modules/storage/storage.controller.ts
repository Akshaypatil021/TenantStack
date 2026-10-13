import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import StorageModel from './storage.model';
import Tenant from '../tenants/tenant.model';
import { S3Service, S3MaintenanceError } from '../../services/s3.service';
import GeminiService from '../../services/gemini.service';
import { PLAN_CONFIG } from '../../config/plan.config';
import { logActivity } from '../activity/activity.controller';
import crypto from 'crypto';
import path from 'path';
import mongoose from 'mongoose';

/**
 * GET /api/v1/storage
 * List tenant files with filtering by category, search by name, pagination, and summary metrics.
 */
export const getStorageObjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { tenantId } = req.user;
    if (!tenantId) {
      res.status(400).json({ error: 'No tenant associated with this user' });
      return;
    }
    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

    // Query params
    const category = req.query.category as string;
    const search = req.query.search as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const skip = (page - 1) * limit;

    // Build filter query
    const query: any = { tenantId: tenantObjectId };

    if (category && category !== 'ALL') {
      query.category = category.toUpperCase();
    }

    if (search && search.trim() !== '') {
      query.originalName = { $regex: search.trim(), $options: 'i' };
    }

    // Run queries in parallel
    const [files, totalCount, aggregateStats, categoryStats, tenant] = await Promise.all([
      StorageModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('uploadedBy', 'firstName lastName email')
        .lean(),
      StorageModel.countDocuments(query),
      StorageModel.aggregate([
        { $match: { tenantId: tenantObjectId } },
        {
          $group: {
            _id: null,
            totalBytes: { $sum: '$fileSizeBytes' },
            totalFiles: { $sum: 1 },
          },
        },
      ]),
      StorageModel.aggregate([
        { $match: { tenantId: tenantObjectId } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalBytes: { $sum: '$fileSizeBytes' },
          },
        },
      ]),
      Tenant.findById(tenantId).select('subscriptionPlan storagePlan name').lean(),
    ]);

    // Calculate usage & plan metrics
    const planName = (tenant?.subscriptionPlan || tenant?.storagePlan || 'Starter Dev') as string;
    const planLimits = PLAN_CONFIG[planName] || PLAN_CONFIG['Starter Dev'] || PLAN_CONFIG.FREE;

    const totalBytes = aggregateStats.length > 0 ? aggregateStats[0].totalBytes : 0;
    const totalUsedMB = Number((totalBytes / (1024 * 1024)).toFixed(2));
    const maxStorageMB = planLimits.maxStorageMB;
    const percentUsed = maxStorageMB > 0 ? Math.min(100, Math.round((totalUsedMB / maxStorageMB) * 100)) : 0;

    // Category distribution map
    const categoryCounts: Record<string, { count: number; sizeMB: number }> = {
      DOCUMENT: { count: 0, sizeMB: 0 },
      DATASET: { count: 0, sizeMB: 0 },
      IMAGE: { count: 0, sizeMB: 0 },
      CODE: { count: 0, sizeMB: 0 },
      ARCHIVE: { count: 0, sizeMB: 0 },
      OTHER: { count: 0, sizeMB: 0 },
    };

    categoryStats.forEach((c: any) => {
      if (categoryCounts[c._id]) {
        categoryCounts[c._id] = {
          count: c.count,
          sizeMB: Number((c.totalBytes / (1024 * 1024)).toFixed(2)),
        };
      }
    });

    // Check S3 bucket health status (cached for 15s)
    const s3Health = await S3Service.checkBucketHealth();

    res.status(200).json({
      files,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      summary: {
        totalUsedMB,
        maxStorageMB,
        percentUsed,
        totalFiles: aggregateStats.length > 0 ? aggregateStats[0].totalFiles : 0,
        plan: planName,
        isQuotaExceeded: totalUsedMB >= maxStorageMB,
        categoryCounts,
        s3Info: {
          isActive: S3Service.isS3Active(),
          bucket: S3Service.getBucketName(),
          region: S3Service.getRegion(),
          prefix: `${tenantId}/storage/`,
          isHealthy: s3Health.isHealthy,
          isUnderMaintenance: s3Health.isUnderMaintenance,
          maintenanceMessage: s3Health.message || null,
        },
      },
    });
  } catch (error: any) {
    console.error('Get storage objects error:', error);
    res.status(500).json({ error: 'Internal Server Error listing storage objects' });
  }
};

/**
 * GET /api/v1/storage/quota
 * Returns detailed quota breakdown: Used MB, Max MB, % Used, file counts by category.
 */
export const getStorageQuota = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { tenantId } = req.user;
    if (!tenantId) {
      res.status(400).json({ error: 'No tenant associated with this user' });
      return;
    }
    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

    const [tenant, aggregateResult, categoryResult] = await Promise.all([
      Tenant.findById(tenantId).lean(),
      StorageModel.aggregate([
        { $match: { tenantId: tenantObjectId } },
        {
          $group: {
            _id: null,
            totalBytes: { $sum: '$fileSizeBytes' },
            totalFiles: { $sum: 1 },
          },
        },
      ]),
      StorageModel.aggregate([
        { $match: { tenantId: tenantObjectId } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalBytes: { $sum: '$fileSizeBytes' },
          },
        },
      ]),
    ]);

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    const planName = (tenant.subscriptionPlan || tenant.storagePlan || 'Starter Dev') as string;
    const planLimits = PLAN_CONFIG[planName] || PLAN_CONFIG['Starter Dev'] || PLAN_CONFIG.FREE;

    const totalBytes = aggregateResult.length > 0 ? aggregateResult[0].totalBytes : 0;
    const totalFiles = aggregateResult.length > 0 ? aggregateResult[0].totalFiles : 0;
    const usedMB = Number((totalBytes / (1024 * 1024)).toFixed(2));
    const maxMB = planLimits.maxStorageMB;
    const remainingMB = Math.max(0, Number((maxMB - usedMB).toFixed(2)));
    const percentUsed = maxMB > 0 ? Math.min(100, Math.round((usedMB / maxMB) * 100)) : 0;
    const isExceeded = usedMB >= maxMB;

    const categories: Record<string, { count: number; usedMB: number }> = {};
    categoryResult.forEach((cat: any) => {
      categories[cat._id] = {
        count: cat.count,
        usedMB: Number((cat.totalBytes / (1024 * 1024)).toFixed(2)),
      };
    });

    res.status(200).json({
      plan: planName,
      usedMB,
      maxMB,
      remainingMB,
      percentUsed,
      totalFiles,
      isExceeded,
      categories,
      s3Bucket: S3Service.getBucketName(),
      s3Region: S3Service.getRegion(),
      s3Prefix: `${tenantId}/storage/`,
      isS3Active: S3Service.isS3Active(),
    });
  } catch (error: any) {
    console.error('Get storage quota error:', error);
    res.status(500).json({ error: 'Internal Server Error retrieving quota' });
  }
};

/**
 * POST /api/v1/storage/upload
 * Multipart upload with real-time quota check and S3 push.
 */
export const uploadStorageObject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.tenantId) {
      res.status(401).json({ error: 'Unauthorized: Tenant required' });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const fileSizeBytes = file.size;
    const fileSizeMB = Number((fileSizeBytes / (1024 * 1024)).toFixed(4));

    // Detect Category
    const category = S3Service.detectCategory(file.mimetype, file.originalname);

    // Generate unique file name
    const ext = path.extname(file.originalname);
    const cleanBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const generatedFileName = `${cleanBase}_${uniqueSuffix}${ext}`;

    // Check if cloud storage is currently under maintenance
    const s3Health = await S3Service.checkBucketHealth();
    if (S3Service.isS3Active() && s3Health.isUnderMaintenance) {
      res.status(503).json({
        code: 'STORAGE_UNDER_MAINTENANCE',
        error: s3Health.message || 'AWS S3 Cloud Storage is currently under maintenance. Please try again after some time.',
      });
      return;
    }

    // Upload to AWS S3 (or fallback to local tenant storage)
    const uploadResult = await S3Service.uploadObject({
      tenantId,
      fileBuffer: file.buffer,
      fileName: generatedFileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });

    // Create DB record
    const storageDoc = await StorageModel.create({
      tenantId,
      fileName: generatedFileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes,
      fileSizeMB,
      category,
      s3Key: uploadResult.s3Key,
      s3Bucket: uploadResult.s3Bucket,
      storageProvider: uploadResult.provider,
      localPath: uploadResult.localPath,
      uploadedBy: userId,
    });

    // Log Activity
    await logActivity(
      tenantId,
      userId,
      'STORAGE_FILE_UPLOADED',
      `Uploaded file "${file.originalname}" (${fileSizeMB} MB) to S3 storage`,
      {
        fileId: storageDoc._id,
        s3Key: uploadResult.s3Key,
        provider: uploadResult.provider,
        sizeMB: fileSizeMB,
        category,
      }
    );

    res.status(201).json({
      message: 'File successfully uploaded to cloud storage',
      file: storageDoc,
    });
  } catch (error: any) {
    console.error('Upload storage object error:', error);
    if (error.code === 'STORAGE_UNDER_MAINTENANCE' || error.name === 'S3MaintenanceError') {
      res.status(503).json({
        code: 'STORAGE_UNDER_MAINTENANCE',
        error: error.message || 'AWS S3 Cloud Storage is currently under maintenance. Please try again after some time.',
      });
      return;
    }
    res.status(500).json({ error: error.message || 'Internal Server Error uploading file' });
  }
};

/**
 * GET /api/v1/storage/:fileId/download
 * Stream download or redirect to pre-signed S3 URL.
 */
export const downloadStorageObject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { fileId } = req.params;
    const { tenantId } = req.user;

    const file = await StorageModel.findOne({ _id: fileId, tenantId });
    if (!file) {
      res.status(404).json({ error: 'File not found or access denied' });
      return;
    }

    // Check if client requested a pre-signed S3 URL directly
    const requestedSignedUrl = req.query.url === 'true';

    if (requestedSignedUrl && file.storageProvider === 'AWS_S3' && S3Service.isS3Active()) {
      const signedUrl = await S3Service.getSignedDownloadUrl({
        s3Key: file.s3Key,
        provider: file.storageProvider,
        originalName: file.originalName,
        expiresInSeconds: 3600,
      });

      if (signedUrl) {
        res.status(200).json({ downloadUrl: signedUrl });
        return;
      }
    }

    // Stream the object directly to client
    try {
      const streamResult = await S3Service.getObjectStream({
        s3Key: file.s3Key,
        provider: file.storageProvider,
        localPath: file.localPath,
        mimeType: file.mimeType,
      });

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(file.originalName)}"`
      );
      res.setHeader('Content-Type', streamResult.contentType);
      if (streamResult.contentLength) {
        res.setHeader('Content-Length', streamResult.contentLength);
      }

      streamResult.stream.pipe(res);
    } catch (streamError: any) {
      console.warn('Storage stream error during download:', streamError?.name || streamError?.message);
      const statusCode = streamError?.$metadata?.httpStatusCode;
      const errorName = streamError?.name || streamError?.Code || '';

      const isMissing =
        statusCode === 404 ||
        errorName === 'NotFound' ||
        errorName === 'NoSuchBucket' ||
        errorName === 'NoSuchKey' ||
        streamError.message?.toLowerCase().includes('not found');

      if (isMissing) {
        res.status(410).json({
          code: 'FILE_CORRUPTED',
          error: `File Corrupted: The underlying storage block for "${file.originalName}" is missing or corrupted in cloud storage. This file occupies ${file.fileSizeMB} MB of your storage quota. Please delete this corrupted file to free up your storage capacity.`,
          fileId: file._id,
          fileName: file.originalName,
          sizeMB: file.fileSizeMB,
        });
        return;
      }
      throw streamError;
    }
  } catch (error: any) {
    console.error('Download storage object error:', error);
    res.status(500).json({ error: 'Internal Server Error downloading file' });
  }
};

/**
 * DELETE /api/v1/storage/:fileId
 * Delete object from S3 and decrement usage.
 */
export const deleteStorageObject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.tenantId) {
      res.status(401).json({ error: 'Unauthorized: Tenant required' });
      return;
    }

    const { fileId } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    const file = await StorageModel.findOne({ _id: fileId, tenantId });
    if (!file) {
      res.status(404).json({ error: 'File not found or access denied' });
      return;
    }

    // Delete physically from S3 or local disk
    await S3Service.deleteObject({
      s3Key: file.s3Key,
      provider: file.storageProvider,
      localPath: file.localPath,
    });

    // Delete from database
    await file.deleteOne();

    // Log Activity
    await logActivity(
      tenantId,
      userId,
      'STORAGE_FILE_DELETED',
      `Deleted file "${file.originalName}" (${file.fileSizeMB} MB) from storage`,
      { fileId, s3Key: file.s3Key }
    );

    res.status(200).json({
      message: 'Storage object deleted successfully',
      fileId,
      freedMB: file.fileSizeMB,
    });
  } catch (error: any) {
    console.error('Delete storage object error:', error);
    res.status(500).json({ error: 'Internal Server Error deleting file' });
  }
};

/**
 * POST /api/v1/storage/:fileId/analyze
 * Trigger automated Google Gemini AI data analysis and cache results in StorageModel.
 */
export const analyzeStorageObject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.tenantId) {
      res.status(401).json({ error: 'Unauthorized: Tenant required' });
      return;
    }

    const { fileId } = req.params;
    const { tenantId, userId } = req.user;
    const forceRefresh = req.body.force === true;

    const file = await StorageModel.findOne({ _id: fileId, tenantId });
    if (!file) {
      res.status(404).json({ error: 'File not found or access denied' });
      return;
    }

    // Return cached analysis if already generated and force re-analysis not requested
    if (!forceRefresh && file.aiAnalysis?.summary && file.aiAnalysis?.analyzedAt) {
      res.status(200).json({
        message: 'Loaded cached AI data analysis',
        analysis: file.aiAnalysis,
        cached: true,
        fileName: file.originalName,
      });
      return;
    }

    // Retrieve file buffer
    let buffer: Buffer;
    try {
      buffer = await S3Service.getObjectBuffer({
        s3Key: file.s3Key,
        provider: file.storageProvider,
        localPath: file.localPath,
      });
    } catch (bufferError: any) {
      console.warn('Storage buffer error during AI analysis:', bufferError?.name || bufferError?.message);
      const statusCode = bufferError?.$metadata?.httpStatusCode;
      const errorName = bufferError?.name || bufferError?.Code || '';

      const isMissing =
        statusCode === 404 ||
        errorName === 'NotFound' ||
        errorName === 'NoSuchBucket' ||
        errorName === 'NoSuchKey' ||
        bufferError.message?.toLowerCase().includes('not found');

      if (isMissing) {
        res.status(410).json({
          code: 'FILE_CORRUPTED',
          error: `Cannot analyze "${file.originalName}": The cloud storage data block is missing or corrupted. This file occupies ${file.fileSizeMB} MB of your storage quota. Please delete this corrupted file from your dashboard to free up space.`,
          fileId: file._id,
        });
        return;
      }
      throw bufferError;
    }

    // Run Gemini analysis engine
    const analysis = await GeminiService.analyzeDocument({
      fileBuffer: buffer,
      mimeType: file.mimeType,
      fileName: file.originalName,
    });

    // Cache results in DB
    file.aiAnalysis = analysis;
    await file.save();

    // Log Activity
    await logActivity(
      tenantId,
      userId,
      'STORAGE_FILE_ANALYZED',
      `Performed Gemini AI data analysis on "${file.originalName}"`,
      {
        fileId: file._id,
        modelUsed: analysis.modelUsed,
        metricsCount: analysis.keyMetrics?.length || 0,
      }
    );

    res.status(200).json({
      message: 'AI data analysis completed successfully',
      analysis: file.aiAnalysis,
      cached: false,
      fileName: file.originalName,
    });
  } catch (error: any) {
    console.error('Analyze storage object error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error analyzing file with Gemini AI' });
  }
};

/**
 * POST /api/v1/storage/:fileId/ask
 * Ask custom interactive questions against the document data using Gemini chat context.
 */
export const askStorageObjectQuestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.tenantId) {
      res.status(401).json({ error: 'Unauthorized: Tenant required' });
      return;
    }

    const { fileId } = req.params;
    const { tenantId } = req.user;
    const { question, history } = req.body;

    if (!question || typeof question !== 'string' || question.trim() === '') {
      res.status(400).json({ error: 'Question is required' });
      return;
    }

    const file = await StorageModel.findOne({ _id: fileId, tenantId });
    if (!file) {
      res.status(404).json({ error: 'File not found or access denied' });
      return;
    }

    // Retrieve file buffer
    const buffer = await S3Service.getObjectBuffer({
      s3Key: file.s3Key,
      provider: file.storageProvider,
      localPath: file.localPath,
    });

    // Call Gemini Q&A
    const result = await GeminiService.askDocumentQuestion({
      fileBuffer: buffer,
      mimeType: file.mimeType,
      fileName: file.originalName,
      question: question.trim(),
      history: Array.isArray(history) ? history : [],
    });

    res.status(200).json({
      question: question.trim(),
      answer: result.answer,
      model: result.model,
      answeredAt: result.answeredAt,
      fileName: file.originalName,
    });
  } catch (error: any) {
    console.error('Ask storage object question error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error during AI document Q&A' });
  }
};

