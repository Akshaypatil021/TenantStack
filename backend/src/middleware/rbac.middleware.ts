import { Response, NextFunction } from 'express';
import Permission from '../modules/permissions/permission.model';
import { AuthenticatedRequest } from './auth.middleware';

/**
 * RBAC Middleware Factory
 * Checks if the logged-in user's role has the required permission for the current tenant.
 * Uses a HashSet (Set) for O(1) constant time complexity checking in memory.
 */
export const requirePermission = (requiredAction: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized: User authentication required' });
        return;
      }

      const { tenantId, roleId } = req.user;

      // Query permissions for this tenant and role
      const userPermissions = await Permission.find({ tenantId, roleId }).select('action').lean();

      // Store actions in a Set for O(1) instant lookup
      const permissionSet = new Set<string>(userPermissions.map((p) => p.action));

      // Check if user has explicit permission OR wildcard '*' full access
      const hasPermission = permissionSet.has(requiredAction) || permissionSet.has('*');

      if (!hasPermission) {
        res.status(403).json({
          error: 'Forbidden: You do not have permission to perform this action',
          requiredPermission: requiredAction,
        });
        return;
      }

      next();
    } catch (error: any) {
      console.error('RBAC Middleware Error:', error);
      res.status(500).json({ error: 'Internal Server Error during permission check' });
    }
  };
};
