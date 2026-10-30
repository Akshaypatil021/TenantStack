import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import Tenant from '../tenants/tenant.model';
import Project from '../projects/project.model';
import Task from '../tasks/task.model';
import { FileModel } from '../files/file.model';
import Activity from '../activity/activity.model';
import { PLAN_CONFIG, resolveWorkspacePlanName } from '../../config/plan.config';
import mongoose from 'mongoose';

/**
 * GET /api/v1/dashboard/stats
 * Returns real-time aggregated dashboard stats for the authenticated user's tenant.
 */
export const getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    if (!tenantId) {
      res.status(400).json({ error: 'No tenant associated with this user' });
      return;
    }

    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Fetch tenant info
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    // Get plan limits
    const planName = resolveWorkspacePlanName(tenant.subscriptionPlan, tenant.storagePlan);
    const planLimits = PLAN_CONFIG[planName] || PLAN_CONFIG['Starter Dev'];

    // ─── Run all aggregations in parallel ───
    const [
      projectsData,
      tasksByStatus,
      tasksByPriority,
      storageData,
      recentActivities,
      totalTeamMembers,
      recentTasks,
      tasksTrend,
    ] = await Promise.all([
      // 1. Projects count & status breakdown (only projects the user is part of)
      Project.aggregate([
        {
          $match: {
            $or: [
              { createdBy: userObjectId },
              { 'members.user': userObjectId },
            ],
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // 2. Tasks by status (across user's accessible projects)
      Task.aggregate([
        { $match: { tenantId: tenantObjectId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalPoints: { $sum: '$storyPoints' },
          },
        },
      ]),

      // 3. Tasks by priority
      Task.aggregate([
        { $match: { tenantId: tenantObjectId } },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 },
          },
        },
      ]),

      // 4. Storage usage
      FileModel.aggregate([
        { $match: { tenantId: tenantObjectId } },
        {
          $group: {
            _id: null,
            totalBytes: { $sum: '$fileSizeBytes' },
            totalFiles: { $sum: 1 },
          },
        },
      ]),

      // 5. Recent activity (last 10)
      Activity.find({ tenantId })
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      // 6. Unique team members across all projects
      Project.aggregate([
        {
          $match: {
            $or: [
              { createdBy: userObjectId },
              { 'members.user': userObjectId },
            ],
          },
        },
        { $unwind: '$members' },
        {
          $group: {
            _id: '$members.user',
          },
        },
        { $count: 'total' },
      ]),

      // 7. Recently updated tasks (last 5)
      Task.find({ tenantId: tenantObjectId })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('title status priority sprint storyPoints assignedTo updatedAt projectId')
        .lean(),

      // 8. Tasks created per day (last 7 days) for a mini trend chart
      Task.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
            points: { $sum: '$storyPoints' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // ─── Process results ───

    // Projects breakdown
    const projectStatusMap: Record<string, number> = {};
    let totalProjects = 0;
    projectsData.forEach((p: any) => {
      projectStatusMap[p._id] = p.count;
      totalProjects += p.count;
    });

    // Tasks breakdown
    const taskStatusMap: Record<string, { count: number; points: number }> = {};
    let totalTasks = 0;
    let totalStoryPoints = 0;
    tasksByStatus.forEach((t: any) => {
      taskStatusMap[t._id] = { count: t.count, points: t.totalPoints };
      totalTasks += t.count;
      totalStoryPoints += t.totalPoints;
    });

    const doneTasks = taskStatusMap['DONE']?.count || 0;
    const inProgressTasks = taskStatusMap['IN_PROGRESS']?.count || 0;
    const todoTasks = taskStatusMap['TODO']?.count || 0;
    const backlogTasks = taskStatusMap['BACKLOG']?.count || 0;
    const inReviewTasks = taskStatusMap['IN_REVIEW']?.count || 0;

    // Priority breakdown
    const priorityMap: Record<string, number> = {};
    tasksByPriority.forEach((t: any) => {
      priorityMap[t._id] = t.count;
    });

    // Storage
    const storageTotalBytes = storageData.length > 0 ? storageData[0].totalBytes : 0;
    const storageTotalFiles = storageData.length > 0 ? storageData[0].totalFiles : 0;
    const storageUsedMB = Number((storageTotalBytes / (1024 * 1024)).toFixed(2));
    const storageMaxMB = planLimits.maxStorageMB;
    const storagePercent = storageMaxMB > 0 ? Math.min(100, Math.round((storageUsedMB / storageMaxMB) * 100)) : 0;

    // Team members
    const teamCount = totalTeamMembers.length > 0 ? totalTeamMembers[0].total : 1;

    // Completion rate
    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    // Velocity (story points done)
    const velocityPoints = taskStatusMap['DONE']?.points || 0;

    // Build 7-day trend with zero-fill
    const trendMap = new Map<string, { count: number; points: number }>();
    tasksTrend.forEach((d: any) => {
      trendMap.set(d._id, { count: d.count, points: d.points });
    });
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const entry = trendMap.get(key) || { count: 0, points: 0 };
      last7Days.push({ date: key, day: dayName, tasks: entry.count, points: entry.points });
    }

    res.status(200).json({
      plan: {
        name: planName,
        billing: tenant.planBilling || 'monthly',
        limits: planLimits,
      },
      projects: {
        total: totalProjects,
        maxAllowed: planLimits.maxProjects,
        percentUsed: planLimits.maxProjects > 0 ? Math.round((totalProjects / planLimits.maxProjects) * 100) : 0,
        byStatus: projectStatusMap,
      },
      tasks: {
        total: totalTasks,
        totalStoryPoints,
        completionRate,
        velocityPoints,
        byStatus: {
          BACKLOG: backlogTasks,
          TODO: todoTasks,
          IN_PROGRESS: inProgressTasks,
          IN_REVIEW: inReviewTasks,
          DONE: doneTasks,
        },
        byPriority: {
          URGENT: priorityMap['URGENT'] || 0,
          HIGH: priorityMap['HIGH'] || 0,
          MEDIUM: priorityMap['MEDIUM'] || 0,
          LOW: priorityMap['LOW'] || 0,
        },
      },
      storage: {
        usedMB: storageUsedMB,
        maxMB: storageMaxMB,
        percentUsed: storagePercent,
        totalFiles: storageTotalFiles,
      },
      team: {
        totalMembers: teamCount,
        maxAllowed: planLimits.maxUsers,
        percentUsed: planLimits.maxUsers > 0 ? Math.round((teamCount / planLimits.maxUsers) * 100) : 0,
      },
      recentActivity: recentActivities,
      recentTasks,
      tasksTrend: last7Days,
    });
  } catch (error: any) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ error: 'Internal Server Error fetching dashboard stats' });
  }
};
