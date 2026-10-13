import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { storageUpload, checkStorageQuota } from './storage.middleware';
import {
  getStorageObjects,
  getStorageQuota,
  uploadStorageObject,
  downloadStorageObject,
  deleteStorageObject,
  analyzeStorageObject,
  askStorageObjectQuestion,
} from './storage.controller';

const router = Router();

// GET /api/v1/storage - List tenant files with filtering, search, pagination, and storage summary
router.get('/', authenticate, getStorageObjects);

// GET /api/v1/storage/quota - Detailed quota breakdown
router.get('/quota', authenticate, getStorageQuota);

// POST /api/v1/storage/upload - Multipart upload with real-time quota check and S3 push
router.post(
  '/upload',
  authenticate,
  storageUpload.single('file'),
  checkStorageQuota,
  uploadStorageObject
);

// POST /api/v1/storage/:fileId/analyze - Google Gemini AI automated structured data analysis
router.post('/:fileId/analyze', authenticate, analyzeStorageObject);

// POST /api/v1/storage/:fileId/ask - Interactive Document Q&A with Gemini chat context
router.post('/:fileId/ask', authenticate, askStorageObjectQuestion);

// GET /api/v1/storage/:fileId/download - Stream download or pre-signed S3 URL
router.get('/:fileId/download', authenticate, downloadStorageObject);

// DELETE /api/v1/storage/:fileId - Delete object from S3 and decrement usage
router.delete('/:fileId', authenticate, deleteStorageObject);

export default router;
