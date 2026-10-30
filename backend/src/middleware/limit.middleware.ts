import { Response, NextFunction } from 'express';
import Tenant from '../modules/tenants/tenant.model';
import Project from '../modules/projects/project.model';
import User from '../modules/users/user.model';
import { PLAN_CONFIG, resolveWorkspacePlanName } from '../config/plan.config';
import { AuthenticatedRequest } from './auth.middleware';
import { getOrSetCache } from '../services/redis.service';

/**
 * Limit Middleware Factory
 * Enforces subscription plan limits (Projects, Users, etc.) before allowing creation.
 * Uses Redis cache for tenant plan lookup and resource count to minimize DB load.
 */
export const checkResourceLimit = (resource: 'projects' | 'users') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized: User authentication required' });
        return;
      }

      const { tenantId } = req.user;

      // 1. Fetch Tenant plan (cached for 5 minutes)
      const { data: tenantData, isCached: planCached } = await getOrSetCache(
        `tenant:${tenantId}:plan`,
        300, // 5 min TTL
        async () => {
          const tenant = await Tenant.findById(tenantId).lean();
          if (!tenant) return null;
          return {
            subscriptionPlan: tenant.subscriptionPlan,
            storagePlan: tenant.storagePlan,
          };
        }
      );

      if (!tenantData) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }

      // Set cache status header for debugging/monitoring
      res.setHeader('X-Cache-Plan', planCached ? 'HIT' : 'MISS');

      const planName = resolveWorkspacePlanName(tenantData.subscriptionPlan, tenantData.storagePlan);
      const planLimits = PLAN_CONFIG[planName] || PLAN_CONFIG['Starter Dev'];

      // 2. Check current resource count vs limit (cached for 30 seconds)
      if (resource === 'projects') {
        const { data: count, isCached: countCached } = await getOrSetCache(
          `tenant:${tenantId}:projects:count`,
          30, // 30 sec TTL - short so new projects are detected quickly
          async () => Project.countDocuments({ tenantId })
        );

        res.setHeader('X-Cache-Count', countCached ? 'HIT' : 'MISS');

        if (planLimits.maxProjects !== -1 && count >= planLimits.maxProjects) {
          res.status(403).json({
            error: `Active project limit reached (${count}/${planLimits.maxProjects}). Your ${planName} plan allows a maximum of ${planLimits.maxProjects} active projects. Please upgrade your plan for higher or unlimited project capacity.`,
            plan: planName,
            currentUsage: count,
            maxLimit: planLimits.maxProjects,
            upgradeRequired: true,
          });
          return;
        }
      } else if (resource === 'users') {
        const { data: count, isCached: countCached } = await getOrSetCache(
          `tenant:${tenantId}:users:count`,
          30,
          async () => User.countDocuments({ tenantId })
        );

        res.setHeader('X-Cache-Count', countCached ? 'HIT' : 'MISS');

        if (planLimits.maxUsers !== -1 && count >= planLimits.maxUsers) {
          res.status(403).json({
            error: `Team user limit reached (${count}/${planLimits.maxUsers}). Your ${planName} plan allows up to ${planLimits.maxUsers} team user(s). Please upgrade to Solo Dev or Pro Dev to collaborate with more members.`,
            plan: planName,
            currentUsage: count,
            maxLimit: planLimits.maxUsers,
            upgradeRequired: true,
          });
          return;
        }
      }

      next();
    } catch (error: any) {
      console.error('Resource Limit Check Error:', error);
      res.status(500).json({ error: 'Internal Server Error during limit check' });
    }
  };
};
