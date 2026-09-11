# adrlint

> A decision-record linter that finds two live decisions contradicting each other, not two missing template fields.

`COMPACT` · **Business Analyst** · Intermediate · ~4 days · Organisations with written decision records

**Primary language:** TypeScript
**Tags:** `adr`, `governance`, `graph-analysis`, `ci`, `documentation`

---

## The problem

Decision records accumulate for three years. ADR-014 says the organisation standardises on PostgreSQL. ADR-061 says new services use DynamoDB by default, and never marks ADR-014 superseded. New joiners find both, pick one each, and the estate fragments along the seam.

## ⭐ The differentiator

Builds a **decision graph and detects unresolved contradictions** - a decision whose subject and scope overlap an earlier *active* decision without an explicit supersedes edge - rather than linting document formatting. It also flags expired review dates and orphaned supersedes chains. A generic ADR tool checks that the template fields are filled in, which has never once prevented an architectural contradiction.

This is the sentence to lead with when someone asks you to walk through the
project. Everything else in this repo exists to make it true and to prove it.

## Data

Self-contained. A fixture corpus of around 60 decision records drawn from public ADR repositories, plus **synthesised contradictions with documented ground truth** - and, critically, correctly-superseded pairs that must *not* be flagged.

> No paid API key is required to run or demo this project. Where a paid
> service would add value it is wired as an optional enhancement behind an
> interface with an offline mock as the default implementation.

## Stack

- TypeScript
- Markdown + front-matter parsing
- Node CLI + GitHub Action
- Vitest

## Core capabilities

- Structured parsing of decision records with subject tagging and scope declaration
- Graph of supersedes / relates-to / conflicts-with edges, with cycle and orphan detection
- Overlap detection on subject and scope flagging probable unresolved contradictions
- Review-date expiry and ownerless-decision reporting
- Rendered decision timeline per subject area

## Repository layout

```
src/parse/
src/graph/
src/rules/
fixtures/
test/
```

## Build plan

1. Parse and tag subjects. Subject tagging quality determines everything downstream.
2. Build the graph, then detect overlap without a supersedes edge.
3. Tune against the correctly-superseded fixtures until the false-positive rate is near zero.
4. Timeline rendering last - it is the artefact people will actually look at.

## Testing strategy

Assert all planted contradictions are found **and that correctly-superseded pairs are not flagged**. The false-positive case is the one that matters: a linter that flags every related decision as a contradiction is deleted from CI within a week.

Tests assert **correctness**, not merely that the code runs. A green suite on
this repo is a claim about behaviour under adversarial conditions; treat any
test that would pass against a deliberately broken implementation as a bug in
the test.

## Measurable outcome

> A rendered decision timeline for one subject area showing two live contradictory decisions and the missing supersedes link - a contradiction that had been live for eleven months.

State it in these terms — business units, not technical ones — in your CV
bullet and in the first thirty seconds of describing the project.

## Interview questions this project answers

- **How do you keep architectural decisions current?**
- **What makes two decisions contradictory rather than merely related?**
- **How would you introduce this to a team with 200 existing ADRs?**

## What this deliberately is *not*

- Not a documentation generator. It reviews what you have written.


## Run it now

```bash
npm test        # runs the suite; no install step needed
npm run demo    # the 60-second artefact
```

Requires Node 22.6+ (24 recommended). TypeScript runs natively via
type stripping - there is no build step and no `node_modules`.

## Getting started

```bash
git clone <your-fork-url> adrlint
cd adrlint
npm install
npx adrlint check docs/decisions/
npx adrlint timeline --subject datastore > timeline.md
npm test
```

Docker is supported but optional — every path above works on a plain
Windows/macOS/Linux laptop without a cloud account.

## Definition of done

- [ ] The differentiator above is implemented, and a test proves it
- [ ] The measurable outcome is produced by a command anyone can run
- [ ] `README` explains the one decision a generic version gets wrong
- [ ] CI runs the full suite on every push and is green on `main`
- [ ] A recruiter can see the headline artefact in under 60 seconds

## Licence

MIT — see [LICENSE](LICENSE).
