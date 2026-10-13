import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import Task, { TaskStatus, TaskPriority } from './task.model';
import Sprint, { SprintStatus } from './sprint.model';
import Project from '../projects/project.model';
import User from '../users/user.model';
import { StorageService } from '../../services/storage.service';

/**
 * Helper to verify user has membership or ownership of the project
 */
const verifyProjectMembership = async (projectId: string, userId: string) => {
  const project = await Project.findById(projectId);
  if (!project) return { project: null, role: null };

  if (project.createdBy.toString() === userId) {
    return { project, role: 'OWNER' };
  }

  const member = project.members.find((m) => m.user.toString() === userId);
  if (member) {
    return { project, role: member.role };
  }

  return { project: null, role: null };
};

/**
 * 1. Get All Tasks for Project
 * GET /api/v1/projects/:projectId/tasks
 */
export const getProjectTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId } = req.params;
    const { project, role } = await verifyProjectMembership(projectId as string, userId);

    if (!project) {
      res.status(403).json({ error: 'Access denied: You are not a member of this project' });
      return;
    }

    const tasks = await Task.find({ projectId }).sort({ createdAt: -1 });

    res.status(200).json({
      count: tasks.length,
      tasks,
      userRole: role,
    });
  } catch (error: any) {
    console.error('Error fetching project tasks:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch tasks' });
  }
};

/**
 * 2. Create Task with Optional Photo Upload
 * POST /api/v1/projects/:projectId/tasks
 */
export const createTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId } = req.params;
    const { project, role } = await verifyProjectMembership(projectId as string, userId);

    if (!project) {
      res.status(403).json({ error: 'Access denied: You are not a member of this project' });
      return;
    }

    if (role === 'VIEWER') {
      res.status(403).json({ error: 'Viewer role cannot create tasks' });
      return;
    }

    const {
      title,
      description,
      status = 'TODO',
      priority = 'MEDIUM',
      sprint = 'Backlog',
      storyPoints = 3,
      assignedUserId,
      dueDate,
    } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ error: 'Task title is required' });
      return;
    }

    const user = await User.findById(userId);
    const creatorName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Team Member';

    let assignedTo: any = undefined;
    if (assignedUserId) {
      const assignedUser = await User.findById(assignedUserId);
      if (assignedUser) {
        assignedTo = {
          userId: assignedUser._id,
          name: `${assignedUser.firstName} ${assignedUser.lastName}`.trim(),
          email: assignedUser.email,
        };
      }
    }

    let photoUrl: string | undefined = undefined;
    let photoName: string | undefined = undefined;

    if (req.file) {
      // Normalize upload URL
      const relativePath = req.file.path.replace(process.cwd(), '').replace(/\\/g, '/');
      photoUrl = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
      photoName = req.file.originalname;
    }

    const task = await Task.create({
      projectId: project._id,
      tenantId: project.tenantId,
      title: title.trim(),
      description: description ? description.trim() : '',
      status: status as TaskStatus,
      priority: priority as TaskPriority,
      sprint: sprint || 'Backlog',
      storyPoints: Number(storyPoints) || 3,
      assignedTo,
      photoUrl,
      photoName,
      attachments: photoUrl
        ? [
            {
              url: photoUrl,
              originalName: photoName || 'photo',
              uploadedBy: creatorName,
              uploadedAt: new Date(),
            },
          ]
        : [],
      createdBy: {
        userId: user!._id,
        name: creatorName,
      },
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    res.status(201).json({
      message: 'Task created successfully',
      task,
    });
  } catch (error: any) {
    console.error('Error creating task:', error);
    if (req.file) {
      StorageService.deleteFile(req.file.path);
    }
    res.status(500).json({ error: error.message || 'Failed to create task' });
  }
};

/**
 * 3. Update Task (Status, Assignee, Priority, Sprint)
 * PUT /api/v1/projects/:projectId/tasks/:taskId
 */
export const updateTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId, taskId } = req.params;
    const { project, role } = await verifyProjectMembership(projectId as string, userId);

    if (!project) {
      res.status(403).json({ error: 'Access denied: You are not a member of this project' });
      return;
    }

    if (role === 'VIEWER') {
      res.status(403).json({ error: 'Viewer role cannot edit tasks' });
      return;
    }

    const task = await Task.findOne({ _id: taskId, projectId });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const {
      title,
      description,
      status,
      priority,
      sprint,
      storyPoints,
      assignedUserId,
      dueDate,
    } = req.body;

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (priority !== undefined) task.priority = priority;
    if (sprint !== undefined) task.sprint = sprint;
    if (storyPoints !== undefined) task.storyPoints = Number(storyPoints);
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : undefined;

    if (status !== undefined) {
      task.status = status;
      if (status === 'DONE') {
        task.completedAt = new Date();
      } else {
        task.completedAt = undefined;
      }
    }

    if (assignedUserId !== undefined) {
      if (assignedUserId) {
        const assignedUser = await User.findById(assignedUserId);
        if (assignedUser) {
          task.assignedTo = {
            userId: assignedUser._id,
            name: `${assignedUser.firstName} ${assignedUser.lastName}`.trim(),
            email: assignedUser.email,
          };
        }
      } else {
        task.assignedTo = undefined;
      }
    }

    await task.save();

    res.status(200).json({
      message: 'Task updated successfully',
      task,
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message || 'Failed to update task' });
  }
};

/**
 * 4. Upload / Attach Photo to Existing Task
 * POST /api/v1/projects/:projectId/tasks/:taskId/photo
 */
export const uploadTaskPhoto = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId, taskId } = req.params;
    const { project, role } = await verifyProjectMembership(projectId as string, userId);

    if (!project) {
      res.status(403).json({ error: 'Access denied: You are not a member of this project' });
      return;
    }

    if (role === 'VIEWER') {
      res.status(403).json({ error: 'Viewer role cannot upload task photos' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No photo uploaded' });
      return;
    }

    const task = await Task.findOne({ _id: taskId, projectId });
    if (!task) {
      StorageService.deleteFile(req.file.path);
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const user = await User.findById(userId);
    const uploaderName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Team Member';

    const relativePath = req.file.path.replace(process.cwd(), '').replace(/\\/g, '/');
    const photoUrl = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

    task.photoUrl = photoUrl;
    task.photoName = req.file.originalname;
    task.attachments.push({
      url: photoUrl,
      originalName: req.file.originalname,
      uploadedBy: uploaderName,
      uploadedAt: new Date(),
    });

    await task.save();

    res.status(200).json({
      message: 'Photo uploaded successfully to task',
      task,
    });
  } catch (error: any) {
    console.error('Error uploading task photo:', error);
    if (req.file) {
      StorageService.deleteFile(req.file.path);
    }
    res.status(500).json({ error: error.message || 'Failed to upload photo' });
  }
};

/**
 * 5. Delete Task
 * DELETE /api/v1/projects/:projectId/tasks/:taskId
 */
export const deleteTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId, taskId } = req.params;
    const { project, role } = await verifyProjectMembership(projectId as string, userId);

    if (!project) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (role === 'VIEWER') {
      res.status(403).json({ error: 'Viewer role cannot delete tasks' });
      return;
    }

    const task = await Task.findOne({ _id: taskId, projectId });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Only OWNER, ADMIN, or task creator can delete
    const isCreator = task.createdBy.userId.toString() === userId;
    if (role !== 'OWNER' && role !== 'ADMIN' && !isCreator) {
      res.status(403).json({ error: 'Only Owner, Admin, or creator can delete this task' });
      return;
    }

    await Task.findByIdAndDelete(taskId);

    res.status(200).json({
      message: 'Task deleted successfully',
      taskId,
    });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: error.message || 'Failed to delete task' });
  }
};

/**
 * 6. Get All Sprints for Project
 * GET /api/v1/projects/:projectId/sprints
 */
export const getProjectSprints = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId } = req.params;
    const { project } = await verifyProjectMembership(projectId as string, userId);

    if (!project) {
      res.status(403).json({ error: 'Access denied: You are not a member of this project' });
      return;
    }

    const sprints = await Sprint.find({ projectId }).sort({ createdAt: 1 });

    res.status(200).json({
      count: sprints.length,
      sprints,
    });
  } catch (error: any) {
    console.error('Error fetching sprints:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch sprints' });
  }
};

/**
 * 7. Create New Sprint
 * POST /api/v1/projects/:projectId/sprints
 */
export const createSprint = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId } = req.params;
    const { project, role } = await verifyProjectMembership(projectId as string, userId);

    if (!project) {
      res.status(403).json({ error: 'Access denied: You are not a member of this project' });
      return;
    }

    if (role === 'VIEWER') {
      res.status(403).json({ error: 'Viewer role cannot create sprints' });
      return;
    }

    const { name, goal, durationWeeks = 2, startDate, endDate, status = 'ACTIVE' } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Sprint name is required' });
      return;
    }

    const user = await User.findById(userId);
    const creatorName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Team Member';

    const sprint = await Sprint.create({
      projectId: project._id,
      tenantId: project.tenantId,
      name: name.trim(),
      goal: goal ? goal.trim() : '',
      durationWeeks: Number(durationWeeks) || 2,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status: (status as SprintStatus) || 'ACTIVE',
      createdBy: {
        userId: user!._id,
        name: creatorName,
      },
    });

    res.status(201).json({
      message: 'Sprint created successfully',
      sprint,
    });
  } catch (error: any) {
    console.error('Error creating sprint:', error);
    res.status(500).json({ error: error.message || 'Failed to create sprint' });
  }
};

/**
 * 8. Update Sprint (Goal, Status, Duration, Name)
 * PUT /api/v1/projects/:projectId/sprints/:sprintId
 */
export const updateSprint = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId, sprintId } = req.params;
    const { project, role } = await verifyProjectMembership(projectId as string, userId);

    if (!project) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (role === 'VIEWER') {
      res.status(403).json({ error: 'Viewer role cannot update sprints' });
      return;
    }

    const sprint = await Sprint.findOne({ _id: sprintId, projectId });
    if (!sprint) {
      res.status(404).json({ error: 'Sprint not found' });
      return;
    }

    const { name, goal, durationWeeks, startDate, endDate, status } = req.body;

    const oldName = sprint.name;
    if (name !== undefined && name.trim()) sprint.name = name.trim();
    if (goal !== undefined) sprint.goal = goal.trim();
    if (durationWeeks !== undefined) sprint.durationWeeks = Number(durationWeeks);
    if (startDate !== undefined) sprint.startDate = startDate ? new Date(startDate) : undefined;
    if (endDate !== undefined) sprint.endDate = endDate ? new Date(endDate) : undefined;
    if (status !== undefined) sprint.status = status as SprintStatus;

    await sprint.save();

    // If sprint name changed, update tasks associated with old name
    if (name !== undefined && name.trim() !== oldName) {
      await Task.updateMany({ projectId, sprint: oldName }, { sprint: name.trim() });
    }

    res.status(200).json({
      message: 'Sprint updated successfully',
      sprint,
    });
  } catch (error: any) {
    console.error('Error updating sprint:', error);
    res.status(500).json({ error: error.message || 'Failed to update sprint' });
  }
};

/**
 * 9. Delete Sprint
 * DELETE /api/v1/projects/:projectId/sprints/:sprintId
 */
export const deleteSprint = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId, sprintId } = req.params;
    const { project, role } = await verifyProjectMembership(projectId as string, userId);

    if (!project) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (role === 'VIEWER') {
      res.status(403).json({ error: 'Viewer role cannot delete sprints' });
      return;
    }

    const sprint = await Sprint.findOne({ _id: sprintId, projectId });
    if (!sprint) {
      res.status(404).json({ error: 'Sprint not found' });
      return;
    }

    // Move any tasks in this sprint back to Backlog so tasks are preserved
    await Task.updateMany(
      { projectId, sprint: sprint.name },
      { sprint: 'Backlog', status: 'BACKLOG' }
    );

    await Sprint.findByIdAndDelete(sprintId);

    res.status(200).json({
      message: 'Sprint deleted successfully. Associated tasks moved to Backlog.',
      sprintId,
    });
  } catch (error: any) {
    console.error('Error deleting sprint:', error);
    res.status(500).json({ error: error.message || 'Failed to delete sprint' });
  }
};

