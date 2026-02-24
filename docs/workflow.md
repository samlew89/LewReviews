# Workflow & Behavior Rules

## Planning & Execution

- ALWAYS plan in detail (markdown) before writing code
- Use subagents aggressively for parallel/independent tasks
- When spawning subagents: give clear roles/descriptions (e.g., "Supabase Specialist", "UI/Feed Engineer")
- Proceed autonomously on routine file edits (acceptEdits enabled)

## Commits

- Commit after each logical chunk with descriptive conventional message
- Format: `feat:`, `fix:`, `refactor:`, `chore:`, etc.
- Stage files individually — `git add .` is forbidden
- After completing a feature or significant refactor, update CLAUDE.md before committing

## When to Ask

Ask before:
- Supabase schema changes
- External API keys
- Destructive operations
- Permissions changes

## Code Style

- Prefer readability + explicit code over clever one-liners
- No console.log in committed code
- Use targeted tests (e.g., single file) instead of full suite for speed

## Safety & Constraints

- Never delete code unless explicitly instructed or obviously dead/unused
- Enforce agree_disagree boolean on response videos (parent_video_id not null)
- Video length: enforce 120s (2 min) max via duration_seconds
