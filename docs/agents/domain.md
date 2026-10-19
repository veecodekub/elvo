# Domain Docs

Elvo Links uses a single-context domain documentation layout across
`apps/` and `packages/`.

## Before Exploring

Read root `CONTEXT.md` for domain vocabulary and relevant decisions
under `docs/adr/`.

If these files do not exist, proceed silently. Create them lazily
through the domain-modeling workflow when terms or decisions are resolved.

## Layout

- `CONTEXT.md`: shared domain glossary and model.
- `docs/adr/NNNN-short-title.md`: architecture decisions.

## Vocabulary and Decisions

Use glossary terms consistently in issues, code, tests, and proposals.
Note meaningful glossary gaps for domain modeling.
Explicitly identify any proposal that contradicts an existing ADR,
including the ADR reference and reason for reconsideration.
