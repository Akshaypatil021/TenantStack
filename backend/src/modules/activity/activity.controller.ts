import { Response } from 'express';
import Activity from './activity.model';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getActivities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(403).json({ success: false, error: 'Not associated with a tenant' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const activities = await Activity.find({ tenantId })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Activity.countDocuments({ tenantId });

    res.status(200).json({
      success: true,
      activities,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Helper function to log activity (used internally by other controllers)
export const logActivity = async (tenantId: string, userId: string | undefined, action: string, details: string, metadata?: any) => {
  try {
    await Activity.create({ tenantId, userId, action, details, metadata });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};
