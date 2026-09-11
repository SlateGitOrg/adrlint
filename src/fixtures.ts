import type { Decision } from './model.ts';

/**
 * A three-year decision log, with planted contradictions AND correctly
 * superseded pairs.
 *
 * The correctly-superseded pairs are the important half of the fixture. Any
 * linter can find overlaps; the one that survives in CI is the one that does
 * not flag the pairs somebody already resolved.
 */

export const DECISIONS: readonly Decision[] = [
  {
    id: 'ADR-014',
    title: 'Standardise on PostgreSQL',
    status: 'accepted',
    date: '2023-04-11',
    owner: 'platform-team',
    subject: 'primary-datastore',
    scope: ['all-services'],
    reviewBy: '2025-04-11',
    body: 'All services use PostgreSQL as their primary datastore.',
  },
  {
    id: 'ADR-061',
    title: 'New services default to DynamoDB',
    status: 'accepted',
    date: '2025-02-03',
    owner: 'payments-team',
    subject: 'primary-datastore',
    scope: ['payments'],
    body: 'New payment services use DynamoDB unless there is a reason not to.',
    // PLANTED: no supersedes edge back to ADR-014, and the scopes overlap.
  },

  // --- a correctly superseded pair. MUST NOT be flagged. -----------------
  {
    id: 'ADR-022',
    title: 'Use RabbitMQ for asynchronous messaging',
    status: 'superseded',
    date: '2023-08-02',
    owner: 'platform-team',
    subject: 'messaging',
    scope: ['all-services'],
    body: 'RabbitMQ is the standard broker.',
  },
  {
    id: 'ADR-048',
    title: 'Move to Kafka for asynchronous messaging',
    status: 'accepted',
    date: '2024-06-19',
    owner: 'platform-team',
    subject: 'messaging',
    scope: ['all-services'],
    supersedes: ['ADR-022'],
    reviewBy: '2027-06-19',
    body: 'Kafka replaces RabbitMQ across the estate.',
  },

  // --- two decisions on one subject with NON-overlapping scope. -----------
  // Also must not be flagged: they govern different parts of the estate.
  {
    id: 'ADR-035',
    title: 'Batch jobs write directly to the warehouse',
    status: 'accepted',
    date: '2024-01-15',
    owner: 'data-team',
    subject: 'warehouse-writes',
    scope: ['batch'],
    body: 'Batch jobs may write to the warehouse without going via the API.',
  },
  {
    id: 'ADR-036',
    title: 'Payment services write to the warehouse via the API only',
    status: 'accepted',
    date: '2024-01-16',
    owner: 'payments-team',
    subject: 'warehouse-writes',
    scope: ['payments'],
    body: 'Payment services must not write directly.',
  },

  // --- a second planted contradiction, at a deeper scope level ------------
  {
    id: 'ADR-052',
    title: 'All services authenticate with mTLS',
    status: 'accepted',
    date: '2024-09-01',
    owner: 'security',
    subject: 'service-authentication',
    scope: ['platform'],
    reviewBy: '2026-09-01',
    body: 'Service-to-service calls use mutual TLS.',
  },
  {
    id: 'ADR-070',
    title: 'Gateway accepts signed JWTs from internal callers',
    status: 'accepted',
    date: '2025-11-20',
    subject: 'service-authentication',
    scope: ['gateway'],
    // PLANTED: gateway is inside platform, so the scopes overlap. Also has no
    // owner, which is a separate finding.
    body: 'Internal callers may present a signed JWT instead of a client cert.',
  },

  // --- a supersedes pointing at nothing -----------------------------------
  {
    id: 'ADR-058',
    title: 'Use OpenTelemetry for tracing',
    status: 'accepted',
    date: '2025-01-09',
    owner: 'platform-team',
    subject: 'observability',
    scope: ['all-services'],
    supersedes: ['ADR-999'],
    body: 'OpenTelemetry replaces the previous tracing library.',
  },

  // --- superseded, but nothing supersedes it ------------------------------
  {
    id: 'ADR-041',
    title: 'Deploy with Helm',
    status: 'superseded',
    date: '2024-03-30',
    owner: 'platform-team',
    subject: 'deployment',
    scope: ['all-services'],
    body: 'Helm charts are the deployment unit.',
  },
];

//: The contradictions planted above, as ordered id pairs.
export const PLANTED_CONTRADICTIONS: ReadonlyArray<readonly [string, string]> = [
  ['ADR-014', 'ADR-061'],
  ['ADR-052', 'ADR-070'],
];

//: Pairs that share a subject but MUST NOT be reported.
export const MUST_NOT_FLAG: ReadonlyArray<readonly [string, string]> = [
  ['ADR-022', 'ADR-048'],   // correctly superseded
  ['ADR-035', 'ADR-036'],   // same subject, disjoint scope
];
