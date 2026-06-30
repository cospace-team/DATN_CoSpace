import {
  pricePolicies,
  cancellationPolicies,
  type PricePolicy,
  type CancellationPolicy,
} from '../data/mockData';

export type PolicySource = 'branch' | 'global';

export interface EffectivePrice extends PricePolicy {
  source: PolicySource;
}

export interface EffectivePolicy extends CancellationPolicy {
  source: PolicySource;
}

/**
 * Returns the effective price for a given workspace type + branch + duration.
 * Branch-specific record ALWAYS wins over the global default.
 */
export function getEffectivePrice(
  workspaceTypeId: string,
  branchId: string,
  durationUnit: 'hour' | 'day' | 'week' | 'month'
): EffectivePrice | null {
  const override = pricePolicies.find(
    (p) =>
      p.workspace_type_id === workspaceTypeId &&
      p.branch_id === branchId &&
      p.duration_unit === durationUnit &&
      p.is_active
  );
  if (override) return { ...override, source: 'branch' };

  const global = pricePolicies.find(
    (p) =>
      p.workspace_type_id === workspaceTypeId &&
      !p.branch_id &&
      p.duration_unit === durationUnit &&
      p.is_active
  );
  return global ? { ...global, source: 'global' } : null;
}

/**
 * Returns all effective cancellation policies for a branch.
 * Branch-specific policies are shown first, then global ones.
 */
export function getEffectivePolicies(branchId: string): EffectivePolicy[] {
  const branchPolicies = cancellationPolicies
    .filter((p) => p.branch_id === branchId && p.is_active)
    .map((p) => ({ ...p, source: 'branch' as PolicySource }));

  const globalPolicies = cancellationPolicies
    .filter((p) => !p.branch_id && p.is_active)
    .map((p) => ({ ...p, source: 'global' as PolicySource }));

  return [...branchPolicies, ...globalPolicies];
}
