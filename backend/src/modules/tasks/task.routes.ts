import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload.middleware';
import {
  getProjectTasks,
  createTask,
  updateTask,
  uploadTaskPhoto,
  deleteTask,
  getProjectSprints,
  createSprint,
  updateSprint,
  deleteSprint,
} from './task.controller';

const router = Router({ mergeParams: true });

// ─── Sprint Routes ───
router.get('/:projectId/sprints', authenticate, getProjectSprints);
router.post('/:projectId/sprints', authenticate, createSprint);
router.put('/:projectId/sprints/:sprintId', authenticate, updateSprint);
router.delete('/:projectId/sprints/:sprintId', authenticate, deleteSprint);

// ─── Task Routes ───
// Get all tasks for a project
router.get('/:projectId/tasks', authenticate, getProjectTasks);

// Create task with optional photo upload
router.post(
  '/:projectId/tasks',
  authenticate,
  upload.single('photo'),
  createTask
);

// Update task details / status
router.put('/:projectId/tasks/:taskId', authenticate, updateTask);

// Upload photo to an existing task
router.post(
  '/:projectId/tasks/:taskId/photo',
  authenticate,
  upload.single('photo'),
  uploadTaskPhoto
);

// Delete task
router.delete('/:projectId/tasks/:taskId', authenticate, deleteTask);

export default router;

