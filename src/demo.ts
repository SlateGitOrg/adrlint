/**
 * The 60-second artefact: a subject timeline with two live, contradictory
 * decisions. Run: `npm run demo`
 */
import { lint, errors, timeline } from './lint.ts';
import { scopesOverlap } from './model.ts';
import { DECISIONS, MUST_NOT_FLAG } from './fixtures.ts';

const TODAY = '2026-09-11';
const findings = lint(DECISIONS, { today: TODAY });

console.log('\n  ADRLINT - two accepted decisions, one contradiction');
console.log('  ' + '='.repeat(74));
console.log(`  ${DECISIONS.length} decision records spanning three years.`);
console.log(`  ${errors(findings).length} error(s), ` +
            `${findings.length - errors(findings).length} warning(s).\n`);

console.log('  WHAT A TEMPLATE LINTER CHECKS');
console.log('  ' + '-'.repeat(74));
console.log('    status present, date present, title present  ->  10/10 pass');
console.log('    ...and the estate still fragments.\n');

console.log('  WHAT THE GRAPH FINDS');
console.log('  ' + '-'.repeat(74));
for (const f of findings.filter((x) => x.severity === 'error')) {
  console.log(`    [${f.kind}]`);
  console.log(`      ${f.message}`);
}
console.log();
for (const f of findings.filter((x) => x.severity === 'warning')) {
  console.log(`    [${f.kind}] ${f.message}`);
}

console.log('\n  WHAT IT DELIBERATELY DOES NOT FLAG');
console.log('  ' + '-'.repeat(74));
for (const [a, b] of MUST_NOT_FLAG) {
  const da = DECISIONS.find((d) => d.id === a)!;
  const db = DECISIONS.find((d) => d.id === b)!;
  const reason = da.subject === db.subject && !scopesOverlap(da.scope, db.scope)
    ? `same subject, disjoint scope (${da.scope.join('/')} vs ${db.scope.join('/')})`
    : 'already resolved by an explicit supersedes edge';
  console.log(`    ${a} / ${b}  -  ${reason}`);
}
console.log('    A linter that flags these is disabled within a week, and then');
console.log('    it catches nothing at all.\n');

console.log('  THE SCOPE RULE THAT MAKES IT WORK');
console.log('  ' + '-'.repeat(74));
console.log(`    "all-services" vs "payments"  overlap: ` +
            `${scopesOverlap(['all-services'], ['payments'])}`);
console.log(`    "platform"     vs "gateway"   overlap: ` +
            `${scopesOverlap(['platform'], ['gateway'])}`);
console.log(`    "batch"        vs "payments"  overlap: ` +
            `${scopesOverlap(['batch'], ['payments'])}`);
console.log('    A literal string comparison gets the first two wrong, and');
console.log('    those are exactly the contradictions that matter.\n');

console.log('  THE TIMELINE A NEW JOINER NEEDS');
console.log('  ' + '-'.repeat(74));
console.log(timeline(DECISIONS, 'primary-datastore')
  .split('\n').map((l) => '    ' + l).join('\n'));
console.log('\n    This contradiction has been live for 19 months.\n');
