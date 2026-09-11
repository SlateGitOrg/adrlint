/**
 * Decision records as a graph, and the contradictions hiding in it.
 *
 * THE DIFFERENTIATOR LIVES HERE.
 *
 * ADR-014 says the organisation standardises on PostgreSQL. ADR-061 says new
 * services use DynamoDB by default, and never marks ADR-014 superseded. Both
 * are `status: accepted`. New joiners find both, pick one each, and the estate
 * fragments along the seam.
 *
 * A conventional ADR tool checks that the template fields are filled in. That
 * has never once prevented an architectural contradiction. What prevents one is
 * treating the records as a GRAPH and detecting a decision whose subject and
 * scope overlap an earlier ACTIVE decision with no supersedes edge between
 * them.
 *
 * The hard part is not finding overlaps. It is not flagging the ones that are
 * correctly superseded, or that apply to genuinely different scopes - because a
 * linter that flags every related decision is deleted from CI within a week.
 */

export type Status = 'proposed' | 'accepted' | 'superseded' | 'rejected';

export interface Decision {
  readonly id: string;
  readonly title: string;
  readonly status: Status;
  readonly date: string;            // ISO
  readonly owner?: string;
  /** What this decision is about. Two decisions sharing a subject may clash. */
  readonly subject: string;
  /**
   * Where it applies. Overlap is what turns a shared subject into a
   * contradiction: "all services" and "payment services" overlap;
   * "batch jobs" and "payment services" do not.
   */
  readonly scope: readonly string[];
  readonly supersedes?: readonly string[];
  readonly relatesTo?: readonly string[];
  /** When this decision should be revisited. */
  readonly reviewBy?: string;
  readonly body: string;
}

/** Scope hierarchy: a parent scope contains its children. */
export const SCOPE_TREE: Record<string, readonly string[]> = {
  'all-services': ['platform', 'payments', 'reporting', 'batch'],
  platform: ['gateway', 'identity'],
  payments: ['ledger', 'settlement'],
  reporting: [],
  batch: [],
  gateway: [],
  identity: [],
  ledger: [],
  settlement: [],
};

function descendants(scope: string, seen = new Set<string>()): Set<string> {
  if (seen.has(scope)) return seen;
  seen.add(scope);
  for (const child of SCOPE_TREE[scope] ?? []) descendants(child, seen);
  return seen;
}

/**
 * Do two scope sets overlap?
 *
 * A set-intersection check on the literal strings gets this wrong in the
 * direction that matters: "all-services" and "payments" share no string, and
 * a decision about all services absolutely does govern payments.
 */
export function scopesOverlap(
  a: readonly string[], b: readonly string[],
): boolean {
  const expandedA = new Set<string>();
  const expandedB = new Set<string>();
  for (const s of a) for (const d of descendants(s)) expandedA.add(d);
  for (const s of b) for (const d of descendants(s)) expandedB.add(d);
  for (const s of expandedA) if (expandedB.has(s)) return true;
  return false;
}

export function isActive(d: Decision): boolean {
  return d.status === 'accepted';
}
