# CLAUDE.md – LewReviews MVP Instructions

## Project Overview
LewReviews is a TikTok-style vertical video feed for movie/TV reviews.
Users upload short review videos. Responses are video-only replies that require an agree/disagree stance.
Response chains accessed via swipe-left or translucent arrow.
MVP goal: low-cost build using Expo + Supabase free tier (no advanced transcoding yet).

## Tech Stack & Conventions
- React Native + Expo (managed workflow)
- Supabase (auth, Postgres DB, storage)
- TypeScript (strict mode)
- Styling: NativeWind / Tailwind
- Video playback: expo-video
- Folder structure: Follow Expo Router pattern (app/(tabs)/, app/(modals)/, components/video/, hooks/, lib/, types/)
- Commits: Conventional Commits (feat:, fix:, refactor:, chore:, etc.)

## Workflow & Behavior Rules
- ALWAYS plan in detail (markdown) before writing code.
- Use subagents aggressively for parallel/independent tasks.
- Commit after each logical chunk with descriptive conventional message.
- Proceed autonomously on routine file edits (acceptEdits enabled).
- Ask only on high-risk actions: Supabase schema changes, external API keys, destructive operations, permissions changes.
- Prefer readability + explicit code over clever/one-liners.
- No console.log in committed code.
- When spawning subagents: give clear roles/descriptions (e.g., "Supabase Specialist", "UI/Feed Engineer").

## Safety & Constraints
- Never delete code unless explicitly instructed or obviously dead/unused.
- Enforce agree_disagree boolean on response videos (parent_video_id not null).
- Video length: enforce ~60s max via duration_seconds.
- Use targeted tests (e.g., single file) instead of full suite for speed.
