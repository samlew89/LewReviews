# Learnings & Future Reference

## Tool Stack Assessment

### What's Elite
- **Claude Code** as the central hub connecting everything via MCP — ahead of the curve. Most devs aren't using AI as an orchestration layer yet.
- **Supabase** for a solo dev building a real product — perfect. Auth, DB, storage, edge functions, no server management.
- **Linear** over Jira/Notion — correct choice. Clean API, fast, designed for eng teams not PMs.

### What's Good But Not Elite
- **Pencil** — useful for quick mockups inside your Claude workflow, but it's not Figma. For design-heavy work (app store screenshots, marketing, detailed component specs), you'll feel the limitations. Great as a sketch pad inside your dev flow, not as your primary design tool.
- **GitHub** — nothing wrong with it, but not using it to its potential. No CI/CD, no automated checks on PRs, no branch protection. Right now it's just a code host.

### What's Missing

| Gap | Tool to Consider | Why |
|-----|-----------------|-----|
| **CI/CD** | GitHub Actions | Auto-run lint, typecheck, tests on every PR. Catches bugs before you review. |
| **Error monitoring (prod)** | Sentry (installed, just need DSN) | Blind to crashes without it live. |
| **Analytics** | PostHog (installed, just need key) | Same — set up but never activated. |
| **Design (serious)** | Figma | For app store assets, marketing, detailed design system. Pencil for quick iteration, Figma for polish. |
| **Hosting/Landing page** | Vercel (already using) | lewreviews.app needs a home for deep links, OG previews, "Open in App" flow. |
| **Email/Comms** | Resend or Loops | Transactional email (welcome, password reset) and eventually marketing. |

### Ideal Day-One Stack (Next Project)
```
Build:    Claude Code + Supabase + Expo
Track:    Linear
Design:   Pencil (sketch) + Figma (polish)
Ship:     GitHub + GitHub Actions + EAS
Operate:  Sentry + PostHog + Vercel (landing)
```

---

## GitHub Actions — What You're Leaving on the Table

**Story 1: The Silent Type Error**
You build a feature at 1am, commit, push, create a PR. Looks fine. You merge it. Next day you open the app and it crashes — turns out you passed a `string` where a `number` was expected in a Supabase query. A 2-second TypeScript check would have caught it.

*With GitHub Actions:* Every PR automatically runs `npx tsc --noEmit`. The PR gets a red X. You see it before you merge. Takes 30 seconds to set up, saves you hours of debugging.

**Story 2: The Lint Creep**
Over 3 months you accumulate 47 `console.log` statements, 12 unused imports, and 3 hooks with missing dependencies. Your CLAUDE.md says "no console.log in committed code" but nothing enforces it.

*With GitHub Actions:* ESLint runs on every PR. The PR literally won't pass with a console.log in it. Your rules become enforced rules, not suggestions.

**Story 3: The "Works On My Machine"**
You hand LewReviews to a friend to contribute. They push code that imports a package they installed locally but forgot to add to package.json. PR looks clean. You merge. EAS Build fails 20 minutes later.

*With GitHub Actions:* A `npm ci` step in CI catches the missing dependency instantly on the PR.

**What a basic LewReviews workflow would look like:**
```
On every PR:
  1. npm ci (install deps, catch missing packages)
  2. npx tsc --noEmit (type check)
  3. npx eslint . (lint)
  4. Run any tests you have

~2 minutes, runs automatically, free on GitHub
```

---

## Sentry — Why You're Flying Blind

**Story 4: The Launch Day Crash**
You submit to the App Store. Apple approves. 50 people download it. 12 of them crash on the feed screen because their phone returns a weird date format from Supabase that you never tested. You don't know. Your App Store rating drops to 2 stars. You find out 3 days later from a 1-star review that says "doesn't work."

*With Sentry:* You get a push notification on your phone within 60 seconds of the first crash. You see the exact stack trace, the device model, the OS version, and the user's ID. You push a fix before the 13th person hits it.

You already have `@sentry/react-native` installed. You just need the DSN in your `.env`. It's literally one environment variable between you and knowing when your app breaks.

---

## PostHog — Why You Need Eyes

**Story 5: The Feature Nobody Uses**
You spent 2 weeks building the rating system (Trash/Meh/Average/Great/Fire). You're proud of it. But in reality, 90% of users skip it and just hit Post. Meanwhile, the Replies button — which you spent 2 hours on — is the most tapped element in the app. Without analytics, you'd spend the next 2 weeks polishing ratings instead of doubling down on replies.

*With PostHog:* You see that `rating_selected` fires 8% of the time, but `replies_opened` fires 73% of the time. You know where to invest.

**Story 6: The Onboarding Drop-off**
Your 3-screen onboarding flow: Welcome → Follow Users → Notifications. You assume most people complete it. Actually, 60% skip at screen 2 and never follow anyone. Their feed is empty. They churn.

*With PostHog:* You see the funnel. Screen 1 → 2: 95%. Screen 2 → 3: 40%. You know exactly where users bail and can fix it.

Same deal — you already installed it. One env var away.

---

## Branch Protection

Right now anyone (including you at 2am) can push directly to `main`. One bad push and your production branch is broken.

2-minute fix: GitHub repo settings → Branches → Add rule for `main`:
- Require PR before merging
- Require status checks to pass (once you have GitHub Actions)

---

## Priority Order

| # | What | Effort | Impact |
|---|------|--------|--------|
| 1 | Add Sentry DSN to .env | 5 min | Know when the app crashes |
| 2 | Add PostHog key to .env | 5 min | Know what users do |
| 3 | Basic GitHub Actions CI | 15 min | PRs get auto-checked |
| 4 | Branch protection on main | 2 min | Can't accidentally break prod |
| 5 | Vercel landing page | 1-2 hrs | Needed for App Store + sharing |

---

## Agentic Workflow Vision

### The Core Loop
Linear (spec) → Pencil (design) → Claude Code (build) → GitHub (ship)

### Skills vs Agents
- **Skills** run inside your current conversation (cheap). Best for structured workflows.
- **Agents** spawn new conversations (expensive, burns rate limits). Best for parallel isolated work.
- For solo dev on Max plan: skills are the better approach. Same specialization, 10% of the cost.

### Multi-Agent (API-Level, Future Projects)
- Orchestrator agent reads Linear backlog
- Specialized agents (UI, backend, auth, design) work in parallel via worktrees
- Each produces a PR you review
- Requires API spend, not Max plan — truly autonomous runs are an API workflow

### Practical Today
- 1 main agent + occasional 1-2 subagents for research
- Well-structured Linear issues = better autonomous output
- Skills that reference Linear issues + Pencil designs = agentic workflow without multi-agent cost
