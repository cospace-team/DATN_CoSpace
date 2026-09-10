/**
 * Legacy branch id aliases kept for backward compat with old URLs/bookmarks
 * (e.g. ?branchId=branch-1) that predate real backend UUIDs.
 */
export const PUBLIC_BRANCH_ALIASES: Record<string, string> = {
  'branch-1': 'b1000000-0000-0000-0000-000000000001',
  'branch-2': 'b2000000-0000-0000-0000-000000000002',
  'branch-3': 'b3000000-0000-0000-0000-000000000003',
  'branch-0001': 'b1000000-0000-0000-0000-000000000001',
  'branch-0002': 'b2000000-0000-0000-0000-000000000002',
  'branch-0003': 'b3000000-0000-0000-0000-000000000003',
  'WH-Q1': 'b1000000-0000-0000-0000-000000000001',
  'WH-Q7': 'b2000000-0000-0000-0000-000000000002',
  'WH-TD': 'b3000000-0000-0000-0000-000000000003',
  'CS-Q1': 'b1000000-0000-0000-0000-000000000001',
};

export const resolveBranchId = (id?: string | null): string => {
  if (!id) return '';
  return PUBLIC_BRANCH_ALIASES[id] ?? id;
};
