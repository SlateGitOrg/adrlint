import { isActive, scopesOverlap, type Decision } from './model.ts';

export type FindingKind =
  | 'UNRESOLVED_CONTRADICTION'
  | 'ORPHAN_SUPERSEDES'
  | 'SUPERSEDES_CYCLE'
  | 'SUPERSEDED_BUT_ACTIVE'
  | 'ACTIVE_BUT_SUPERSEDED_BY_NOTHING'
  | 'REVIEW_OVERDUE'
  | 'NO_OWNER';

export interface Finding {
  readonly kind: FindingKind;
  readonly decisions: readonly string[];
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

export interface LintOptions {
  readonly today: string;
}

/**
 * The check that matters: two ACTIVE decisions on the same subject with
 * overlapping scope and no supersedes edge between them.
 */
function contradictions(decisions: readonly Decision[]): Finding[] {
  const active = decisions.filter(isActive);
  const supersedes = new Map<string, Set<string>>();
  for (const d of decisions) {
    supersedes.set(d.id, new Set(d.supersedes ?? []));
  }

  const linked = (a: Decision, b: Decision): boolean =>
    (supersedes.get(a.id)?.has(b.id) ?? false) ||
    (supersedes.get(b.id)?.has(a.id) ?? false);

  const out: Finding[] = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]!;
      const b = active[j]!;
      if (a.subject !== b.subject) continue;
      if (!scopesOverlap(a.scope, b.scope)) continue;
      if (linked(a, b)) continue;

      const [older, newer] = a.date <= b.date ? [a, b] : [b, a];
      out.push({
        kind: 'UNRESOLVED_CONTRADICTION',
        decisions: [older.id, newer.id],
        severity: 'error',
        message:
          `${newer.id} ("${newer.title}") and ${older.id} ("${older.title}") ` +
          `are both accepted, both govern ${a.subject}, and their scopes ` +
          `overlap - but ${newer.id} does not supersede ${older.id}`,
      });
    }
  }
  return out;
}

function supersedesIntegrity(decisions: readonly Decision[]): Finding[] {
  const byId = new Map(decisions.map((d) => [d.id, d]));
  const out: Finding[] = [];

  for (const d of decisions) {
    for (const target of d.supersedes ?? []) {
      const referenced = byId.get(target);
      if (!referenced) {
        out.push({
          kind: 'ORPHAN_SUPERSEDES',
          decisions: [d.id, target],
          severity: 'error',
          message: `${d.id} supersedes ${target}, which does not exist`,
        });
        continue;
      }
      if (isActive(referenced) && isActive(d)) {
        out.push({
          kind: 'SUPERSEDED_BUT_ACTIVE',
          decisions: [d.id, referenced.id],
          severity: 'error',
          message:
            `${d.id} supersedes ${referenced.id}, but ${referenced.id} is ` +
            `still marked accepted`,
        });
      }
    }
  }

  // Cycles: A supersedes B supersedes A. Rare, and completely paralysing when
  // somebody tries to work out which decision is current.
  const visiting = new Set<string>();
  const done = new Set<string>();
  const walk = (id: string, path: string[]): void => {
    if (done.has(id)) return;
    if (visiting.has(id)) {
      out.push({
        kind: 'SUPERSEDES_CYCLE',
        decisions: [...path.slice(path.indexOf(id)), id],
        severity: 'error',
        message: `supersedes cycle: ${[...path.slice(path.indexOf(id)), id]
          .join(' -> ')}`,
      });
      return;
    }
    visiting.add(id);
    for (const next of byId.get(id)?.supersedes ?? []) {
      if (byId.has(next)) walk(next, [...path, id]);
    }
    visiting.delete(id);
    done.add(id);
  };
  for (const d of decisions) walk(d.id, []);

  for (const d of decisions) {
    if (d.status === 'superseded') {
      const replacedBy = decisions.some(
        (x) => (x.supersedes ?? []).includes(d.id));
      if (!replacedBy) {
        out.push({
          kind: 'ACTIVE_BUT_SUPERSEDED_BY_NOTHING',
          decisions: [d.id],
          severity: 'warning',
          message:
            `${d.id} is marked superseded but nothing supersedes it - the ` +
            `decision it was replaced by cannot be found`,
        });
      }
    }
  }
  return out;
}

function hygiene(decisions: readonly Decision[], today: string): Finding[] {
  const out: Finding[] = [];
  for (const d of decisions) {
    if (!isActive(d)) continue;
    if (d.reviewBy && d.reviewBy < today) {
      out.push({
        kind: 'REVIEW_OVERDUE',
        decisions: [d.id],
        severity: 'warning',
        message:
          `${d.id} was due for review on ${d.reviewBy} and is still accepted` +
          (d.owner ? ` (owner: ${d.owner})` : ''),
      });
    }
    if (!d.owner) {
      out.push({
        kind: 'NO_OWNER',
        decisions: [d.id],
        severity: 'warning',
        message: `${d.id} has no owner, so nobody can be asked about it`,
      });
    }
  }
  return out;
}

export function lint(
  decisions: readonly Decision[], options: LintOptions,
): Finding[] {
  return [
    ...contradictions(decisions),
    ...supersedesIntegrity(decisions),
    ...hygiene(decisions, options.today),
  ];
}

export function errors(findings: readonly Finding[]): Finding[] {
  return findings.filter((f) => f.severity === 'error');
}

/** A per-subject timeline: what a new joiner needs and never gets. */
export function timeline(
  decisions: readonly Decision[], subject: string,
): string {
  const rows = decisions
    .filter((d) => d.subject === subject)
    .sort((a, b) => a.date.localeCompare(b.date));

  const lines = [`# Decisions on "${subject}"`, ''];
  for (const d of rows) {
    const mark = isActive(d) ? 'ACTIVE  ' : `${d.status.padEnd(8)}`;
    lines.push(`${d.date}  ${mark}  ${d.id}  ${d.title}`);
    lines.push(`                        scope: ${d.scope.join(', ')}`);
    if (d.supersedes?.length) {
      lines.push(`                        supersedes: ${d.supersedes.join(', ')}`);
    }
  }
  const active = rows.filter(isActive);
  lines.push('');
  lines.push(
    active.length > 1
      ? `${active.length} decisions are simultaneously ACTIVE on this subject: ` +
        active.map((d) => d.id).join(', ')
      : `Current: ${active[0]?.id ?? 'none'}`);
  return lines.join('\n');
}
