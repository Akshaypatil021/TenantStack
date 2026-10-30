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
    maxStorageMB: 5120, // 5 GB NVMe
    maxApiRequestsPerDay: 5000,
  },
  'Solo Dev': {
    maxUsers: 5,
    maxProjects: 15,
    maxStorageMB: 25600, // 25 GB NVMe
    maxApiRequestsPerDay: 50000,
  },
  'Pro Dev': {
    maxUsers: 15,
    maxProjects: -1, // Unlimited Active Projects
    maxStorageMB: 102400, // 100 GB NVMe
    maxApiRequestsPerDay: 200000,
  },
  // Backward compatibility aliases
  FREE: {
    maxUsers: 1,
    maxProjects: 3,
    maxStorageMB: 5120,
    maxApiRequestsPerDay: 5000,
  },
  PRO: {
    maxUsers: 5,
    maxProjects: 15,
    maxStorageMB: 25600,
    maxApiRequestsPerDay: 50000,
  },
  BUSINESS: {
    maxUsers: 15,
    maxProjects: -1,
    maxStorageMB: 102400,
    maxApiRequestsPerDay: 200000,
  },
};

/**
 * Resolves the canonical workspace / storage plan name from a tenant's plan fields.
 * Handles composite names (e.g. "Dev Pro & Solo Dev"), legacy names ("FREE", "PRO"),
 * and defaults to "Starter Dev".
 */
export function resolveWorkspacePlanName(
  subscriptionPlan?: string | null,
  storagePlan?: string | null
): string {
  const combined = `${subscriptionPlan || ''} ${storagePlan || ''}`.trim();

  if (combined.includes('Pro Dev') || combined.includes('BUSINESS')) {
    return 'Pro Dev';
  }
  if (combined.includes('Solo Dev') || combined.includes('PRO')) {
    return 'Solo Dev';
  }
  if (combined.includes('Starter Dev') || combined.includes('Free Tier') || combined.includes('FREE')) {
    return 'Starter Dev';
  }

  if (subscriptionPlan && PLAN_CONFIG[subscriptionPlan]) {
    return subscriptionPlan;
  }
  if (storagePlan && PLAN_CONFIG[storagePlan]) {
    return storagePlan;
  }

  return 'Starter Dev';
}

/**
 * Returns the PlanLimits for a given tenant or plan name.
 */
export function getPlanLimits(
  subscriptionPlan?: string | null,
  storagePlan?: string | null
): PlanLimits {
  const resolvedName = resolveWorkspacePlanName(subscriptionPlan, storagePlan);
  return PLAN_CONFIG[resolvedName] || PLAN_CONFIG['Starter Dev'];
}
