# Core Beliefs

> This document defines invariant principles for contributors and agents working on Monolog.

## Code Quality

1. **Test First**: Feature changes should include tests where the project already uses them; add coverage for critical paths when introducing new behavior.
2. **Incremental Changes**: Prefer small, reviewable changes over large batches.
3. **Explicit > Implicit**: Prefer clear code over hidden magic.

## Architecture

4. **Dependency Direction**: Routers depend on services; services depend on shared models and infrastructure — avoid circular imports.
5. **Boundary Maintenance**: Keep LLM and crypto details behind service/shared layers where possible.

## Process

6. **Design First**: For multi-day or cross-cutting work, add or update a design doc under `docs/design-docs/` before deep implementation.
7. **Doc Synchronization**: Update [docs/API.md](../API.md), [docs/DATABASE.md](../DATABASE.md), or [docs/DESIGN.md](../DESIGN.md) when behavior, schema, or UI tokens change.

## Agent Operation

8. **Autonomy Scope**: Follow existing patterns in `backend/app` and `frontend/src` unless explicitly changing architecture.
9. **Escalation**: Confirm before introducing new dependencies, auth models, or breaking API/schema changes.
10. **Plan Recording**: For complex tasks, track steps in issues or short plan notes.
