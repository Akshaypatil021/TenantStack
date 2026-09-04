import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { upload, checkStorageLimit } from '../../middleware/upload.middleware';
import {
  uploadFile,
  getProjectFiles,
  deleteFile,
  getStorageUsage,
} from './file.controller';

const router = Router();

// Storage usage summary
router.get('/usage', authenticate, getStorageUsage);

// Upload file to project
router.post(
  '/projects/:projectId',
  authenticate,
  checkStorageLimit,
  upload.single('file'),
  uploadFile
);

// List files for project
router.get('/projects/:projectId', authenticate, getProjectFiles);

// Delete file
router.delete('/:fileId', authenticate, deleteFile);

export default router;
