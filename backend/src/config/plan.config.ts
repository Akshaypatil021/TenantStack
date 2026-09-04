export interface PlanLimits {
  maxUsers: number;
  maxProjects: number;
  maxStorageMB: number;
  maxApiRequestsPerDay: number;
}

export const PLAN_CONFIG: Record<'FREE' | 'PRO' | 'BUSINESS', PlanLimits> = {
  FREE: {
    maxUsers: 2,
    maxProjects: 5,
    maxStorageMB: 10,
    maxApiRequestsPerDay: 100,
  },
  PRO: {
    maxUsers: 10,
    maxProjects: 20,
    maxStorageMB: 50,
    maxApiRequestsPerDay: 1000,
  },
  BUSINESS: {
    maxUsers: 15,
    maxProjects: 100,
    maxStorageMB: 100,
    maxApiRequestsPerDay: 2000,
  },
};
