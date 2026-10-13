export interface PlanLimits {
  maxUsers: number;
  maxProjects: number;
  maxStorageMB: number;
  maxApiRequestsPerDay: number;
}

export const PLAN_CONFIG: Record<string, PlanLimits> = {
  'Starter Dev': {
    maxUsers: 1,
    maxProjects: 3,
    maxStorageMB: 5120,
    maxApiRequestsPerDay: 5000,
  },
  'Solo Dev': {
    maxUsers: 5,
    maxProjects: 15,
    maxStorageMB: 25600,
    maxApiRequestsPerDay: 50000,
  },
  'Pro Dev': {
    maxUsers: 15,
    maxProjects: 100,
    maxStorageMB: 102400,
    maxApiRequestsPerDay: 200000,
  },
  FREE: {
    maxUsers: 1,
    maxProjects: 3,
    maxStorageMB: 5120,
    maxApiRequestsPerDay: 5000,
  },
  PRO: {
    maxUsers: 10,
    maxProjects: 20,
    maxStorageMB: 51200,
    maxApiRequestsPerDay: 50000,
  },
  BUSINESS: {
    maxUsers: 15,
    maxProjects: 100,
    maxStorageMB: 102400,
    maxApiRequestsPerDay: 100000,
  },
};
