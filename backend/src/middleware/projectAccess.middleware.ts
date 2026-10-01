import { Response, NextFunction } from 'express';
import Project from '../modules/projects/project.model';
import { AuthenticatedRequest } from './auth.middleware';
import { ProjectMemberRole } from '../modules/projects/project.model';

/**
 * Project Access Middleware Factory
 * 
 * Verifies the logged-in user has access to the requested project.
 * Access is granted if:
 *   1. User is the project creator (OWNER), OR
 *   2. User is listed in the project's `members` array
 * 
 * Optionally, you can restrict to specific project-level roles
 * (e.g., only CONTRIBUTOR+ can upload files, VIEWER can only read).
 * 
 * @param allowedRoles - If provided, only members with these project roles can proceed.
 *                       If omitted, any project member (including VIEWER) is allowed.
 */
export const checkProjectAccess = (allowedRoles?: ProjectMemberRole[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const { userId, tenantId } = req.user;
      // projectId can come from route params or body
      const projectId = req.params.projectId || req.body.projectId;

      if (!projectId) {
        res.status(400).json({ error: 'Bad Request: projectId is required' });
        return;
      }

      const project = await Project.findOne({ _id: projectId, tenantId });

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Check 1: Is this user the project creator (OWNER)?
      const isCreator = project.createdBy.toString() === userId;

      // Check 2: Is this user in the members array?
      const memberEntry = project.members.find(
        (m) => m.user.toString() === userId
      );

      if (!isCreator && !memberEntry) {
        res.status(403).json({
          error: 'Access Denied: You do not have access to this project',
        });
        return;
      }

      // Check 3 (optional): Role-level restriction within the project
      if (allowedRoles && allowedRoles.length > 0) {
        // Creator always has OWNER-level access
        const effectiveRole: ProjectMemberRole = isCreator
          ? 'OWNER'
          : memberEntry!.role;

        if (!allowedRoles.includes(effectiveRole)) {
          res.status(403).json({
            error: `Forbidden: Your project role (${effectiveRole}) does not permit this action`,
            requiredRoles: allowedRoles,
          });
          return;
        }
      }

      // Attach project to request for downstream use (avoids duplicate DB query)
      (req as any).project = project;

      next();
    } catch (error: any) {
      console.error('Project Access Middleware Error:', error);
      res.status(500).json({ error: 'Internal Server Error during project access check' });
    }
  };
};
