# ADR-0004: Project Harmony Namespace Cutover

- Date: 2026-07-15
- Status: Accepted

## Context

Project Harmony replaces the Isekai product namespace in one coordinated,
breaking release train. `@plasius/ai-speech` exposes the Player System audio
rollout key as a public constant used by deterministic dispatch policy. Keeping
the previous value or a compatibility branch would make host rollout state
ambiguous.

The tracked implementation is
[Plasius-LTD/ai-speech#29](https://github.com/Plasius-LTD/ai-speech/issues/29),
under the Project Harmony namespace Feature and its remote rollout control
`harmony.namespace-cutover.enabled`.

## Decision

- Replace `isekai.player-system.audio.enabled` with
  `harmony.player-system.audio.enabled`.
- Publish only the Harmony value in the public constant and policy inputs.
- Do not add an alias, dual-read parser, environment fallback, or runtime
  translation for the previous namespace.
- Keep feature-flag evaluation in host applications; the package continues to
  evaluate only caller-supplied snapshots.
- Release the change as the next major package version through the repository's
  approved `cd.yml` workflow.

## Rollout and rollback

The host feature-flag service is the source of truth for
`harmony.namespace-cutover.enabled`. Consumers update stored keys and package
majors during the coordinated maintenance window, then enable the flag for the
approved cohort.

Rollback requires disabling the cutover flag, restoring the coordinated
previous package majors, and applying the verified reverse stored-value
migration. This contract package has no persistent store of its own.

## Consequences

- Consumers receive one canonical Harmony audio rollout key.
- The exported string-value change is intentionally SemVer-major while the
  TypeScript symbol name remains stable.
- `player-system` can consume the new major only as part of the coordinated
  cutover release train.
