# LewReviews Agent Instructions

This file is for agent-style coding tools that read `AGENTS.md`. In this repo, `CLAUDE.md` remains the primary instruction file for Claude Code. Keep both files aligned when core workflow rules change.

## Mission

Build and maintain LewReviews as a mobile-first short-video app with a stable fullscreen feed, flat reply architecture, and predictable Supabase-backed data flows.

## Stack

- Expo / React Native
- Expo Router
- TanStack Query
- Supabase
- TypeScript

## Product Constraints

- Root feed is fullscreen vertical video.
- Replies are flat: all replies target the root video, not another reply.
- Response uploads require agree/disagree unless the flow explicitly skips stance.
- Profile ratio = total agrees minus total disagrees.

## Non-Negotiables

- Do not delete or rewrite unrelated code.
- Ask before destructive data or schema changes.
- No broad refactors during bug fixes unless they directly remove the root cause.
- Prefer small local fixes over sweeping architectural changes.
- Avoid mixed sizing sources in fullscreen feed code. Item height, snap interval, layout math, and active index math must share the same live dimension source.
- Keep navigation state stable when moving between feed, replies, profile, and detail screens.

## Data Rules

- Use React Query for server-backed state whenever practical.
- Avoid manual fetch-on-focus patterns if a query can own the data lifecycle.
- Do not load full tables or full user datasets unless the screen truly needs them.
- Pagination must not overlap, skip, or depend on unstable ordering.
- When invalidating cache after mutations, target the narrowest keys that keep UI correct.

## Media Rules

- Fullscreen playback quality matters more than clever abstractions.
- Only the active video should do meaningful playback work.
- Share sheet, app foregrounding, and navigation transitions must preserve sane playback behavior.
- Do not change crop/fit behavior casually; verify `contentFit="cover"` flows still fill the viewport.

## Default Workflow

1. Inspect the existing code path before proposing changes.
2. Identify the smallest viable fix.
3. Call out likely UI/UX impact before editing.
4. Implement narrowly.
5. Review for regressions in feed, replies, detail, profile, and upload flows.
6. Summarize actual risk, not hypothetical noise.

## Review Priorities

Order findings by:

1. User-visible regressions in feed/replies/playback
2. Data correctness and pagination bugs
3. Performance and battery issues
4. Architectural consistency
5. Style and cleanup

## Useful Claude Commands

- `/feature-build`
- `/bug-investigation`
- `/perf-check`
- `/code-review`
- `/schema-change`
