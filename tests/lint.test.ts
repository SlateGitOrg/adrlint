import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { lint, errors, timeline } from '../src/lint.ts';
import { scopesOverlap, type Decision } from '../src/model.ts';
import { DECISIONS, MUST_NOT_FLAG, PLANTED_CONTRADICTIONS } from '../src/fixtures.ts';

const TODAY = '2026-09-11';
const findings = lint(DECISIONS, { today: TODAY });
const contradictions = findings.filter(
  (f) => f.kind === 'UNRESOLVED_CONTRADICTION');

function pairs(): string[] {
  return contradictions.map((f) => [...f.decisions].sort().join('|')).sort();
}

describe('detection against planted ground truth', () => {
  test('every planted contradiction is found', () => {
    for (const [a, b] of PLANTED_CONTRADICTIONS) {
      assert.ok(
        pairs().includes([a, b].sort().join('|')),
        `MISSED planted contradiction: ${a} vs ${b}`,
      );
    }
  });

  test('THE FALSE-POSITIVE CASE: correctly superseded pairs are NOT flagged', () => {
    // The half everyone gets wrong. A linter that flags resolved pairs is
    // deleted from CI within a week.
    for (const [a, b] of MUST_NOT_FLAG) {
      assert.ok(
        !pairs().includes([a, b].sort().join('|')),
        `FALSE POSITIVE: ${a} vs ${b} was flagged but is already resolved`,
      );
    }
  });

  test('exactly the planted contradictions, no more', () => {
    assert.equal(
      pairs().length, PLANTED_CONTRADICTIONS.length,
      `expected ${PLANTED_CONTRADICTIONS.length} contradictions, got ` +
      `${pairs().length}: ${pairs().join(', ')}`,
    );
  });

  test('the finding names both decisions and explains the clash', () => {
    const f = contradictions.find((x) => x.decisions.includes('ADR-014'))!;
    assert.match(f.message, /ADR-061/);
    assert.match(f.message, /ADR-014/);
    assert.match(f.message, /primary-datastore/);
    assert.match(f.message, /does not supersede/);
  });
});

describe('scope overlap - the reason a string check is not enough', () => {
  test('a parent scope governs its children', () => {
    // "all-services" and "payments" share no literal string, and a decision
    // about all services absolutely does govern payments.
    assert.equal(scopesOverlap(['all-services'], ['payments']), true);
    assert.equal(scopesOverlap(['platform'], ['gateway']), true);
  });

  test('sibling scopes do not overlap', () => {
    assert.equal(scopesOverlap(['batch'], ['payments']), false);
    assert.equal(scopesOverlap(['gateway'], ['identity']), false);
  });

  test('a scope overlaps itself', () => {
    assert.equal(scopesOverlap(['payments'], ['payments']), true);
  });

  test('overlap is symmetric', () => {
    assert.equal(
      scopesOverlap(['all-services'], ['ledger']),
      scopesOverlap(['ledger'], ['all-services']));
  });

  test('deep nesting is followed', () => {
    assert.equal(scopesOverlap(['all-services'], ['settlement']), true);
  });
});

describe('supersedes integrity', () => {
  test('a supersedes pointing at a non-existent decision is an error', () => {
    const f = findings.find((x) => x.kind === 'ORPHAN_SUPERSEDES');
    assert.ok(f);
    assert.deepEqual(f!.decisions, ['ADR-058', 'ADR-999']);
  });

  test('a decision marked superseded by nothing is reported', () => {
    const f = findings.find(
      (x) => x.kind === 'ACTIVE_BUT_SUPERSEDED_BY_NOTHING');
    assert.ok(f);
    assert.deepEqual(f!.decisions, ['ADR-041']);
  });

  test('superseding an still-active decision is an error', () => {
    const broken: Decision[] = [
      { id: 'A', title: 'a', status: 'accepted', date: '2024-01-01',
        subject: 's', scope: ['batch'], body: '' },
      { id: 'B', title: 'b', status: 'accepted', date: '2024-06-01',
        subject: 's', scope: ['batch'], supersedes: ['A'], body: '' },
    ];
    const f = lint(broken, { today: TODAY }).find(
      (x) => x.kind === 'SUPERSEDED_BUT_ACTIVE');
    assert.ok(f, 'A is superseded but still marked accepted');
  });

  test('a supersedes cycle is detected rather than looping forever', () => {
    const cyclic: Decision[] = [
      { id: 'A', title: 'a', status: 'accepted', date: '2024-01-01',
        subject: 's', scope: ['batch'], supersedes: ['B'], body: '' },
      { id: 'B', title: 'b', status: 'superseded', date: '2024-02-01',
        subject: 's', scope: ['batch'], supersedes: ['A'], body: '' },
    ];
    const f = lint(cyclic, { today: TODAY }).find(
      (x) => x.kind === 'SUPERSEDES_CYCLE');
    assert.ok(f);
    assert.match(f!.message, /->/);
  });
});

describe('hygiene', () => {
  test('an overdue review on an ACTIVE decision is reported', () => {
    const f = findings.filter((x) => x.kind === 'REVIEW_OVERDUE');
    assert.ok(f.some((x) => x.decisions.includes('ADR-014')),
      'ADR-014 was due for review in 2025 and is still accepted');
  });

  test('a future review date is not reported', () => {
    const overdue = findings
      .filter((x) => x.kind === 'REVIEW_OVERDUE')
      .flatMap((x) => x.decisions);
    assert.ok(!overdue.includes('ADR-048'), 'ADR-048 is due in 2027');
  });

  test('a decision with no owner is reported', () => {
    const f = findings.find((x) => x.kind === 'NO_OWNER');
    assert.ok(f);
    assert.deepEqual(f!.decisions, ['ADR-070']);
  });

  test('hygiene findings are warnings, contradictions are errors', () => {
    assert.ok(errors(findings).every(
      (f) => f.kind !== 'REVIEW_OVERDUE' && f.kind !== 'NO_OWNER'));
    assert.ok(errors(findings).some(
      (f) => f.kind === 'UNRESOLVED_CONTRADICTION'));
  });
});

describe('the timeline a new joiner needs', () => {
  test('shows both live decisions on a contested subject', () => {
    const out = timeline(DECISIONS, 'primary-datastore');
    assert.match(out, /ADR-014/);
    assert.match(out, /ADR-061/);
    assert.match(out, /2 decisions are simultaneously ACTIVE/);
  });

  test('shows a single current decision on a resolved subject', () => {
    const out = timeline(DECISIONS, 'messaging');
    assert.match(out, /Current: ADR-048/);
    assert.match(out, /supersedes: ADR-022/);
  });

  test('orders by date', () => {
    const out = timeline(DECISIONS, 'primary-datastore');
    assert.ok(out.indexOf('ADR-014') < out.indexOf('ADR-061'));
  });
});

describe('a clean log produces nothing', () => {
  test('no findings on a well-maintained set', () => {
    const clean: Decision[] = [
      { id: 'A', title: 'a', status: 'superseded', date: '2024-01-01',
        owner: 'x', subject: 's', scope: ['batch'], body: '' },
      { id: 'B', title: 'b', status: 'accepted', date: '2024-06-01',
        owner: 'x', subject: 's', scope: ['batch'], supersedes: ['A'],
        reviewBy: '2099-01-01', body: '' },
    ];
    assert.deepEqual(lint(clean, { today: TODAY }), []);
  });
});
