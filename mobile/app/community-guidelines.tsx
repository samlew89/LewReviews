import React from 'react';
import LegalScreen from '../components/LegalScreen';

const COMMUNITY_GUIDELINES = `# Community Guidelines

**Last updated: March 10, 2026**

LewReviews is a community where people share honest video reviews and debate their takes on movies and TV shows. To keep this space fun, fair, and safe for everyone, we ask all users to follow these guidelines.

---

## Be Respectful

- **Disagree with the take, not the person.** Healthy debate is the heart of LewReviews. Attack the opinion, not the reviewer.
- **No harassment, bullying, or threats.** This includes repeated unwanted contact, intimidation, or encouraging others to target someone.
- **No hate speech.** Content that promotes violence or hatred against individuals or groups based on race, ethnicity, national origin, religion, gender, gender identity, sexual orientation, disability, or age is not allowed.

---

## Keep It Honest

- **Share your genuine opinion.** Reviews should reflect what you actually think.
- **No spam or misleading content.** Don't post repetitive, deceptive, or off-topic content to manipulate engagement.
- **No impersonation.** Don't pretend to be someone you're not, whether that's another user, a public figure, or a brand.

---

## Keep It Safe

- **No sexually explicit content.** LewReviews is not the place for nudity or sexual material.
- **No graphic violence.** Brief movie clips for context are fine; gratuitous real-world violence is not.
- **No content that endangers minors.** Any content that exploits or endangers anyone under 18 will result in immediate removal and account termination.
- **No illegal activity.** Don't use LewReviews to promote, coordinate, or engage in illegal activities.

---

## Respect Intellectual Property

- **Use content you have the right to share.** Don't upload full movies, TV episodes, or other copyrighted material you don't own or have permission to use.
- **Brief clips for commentary are acceptable.** Short clips used in the context of a review or critique fall under fair use, but don't push it.

---

## How We Moderate

- **Reporting:** If you see content that violates these guidelines, tap the "..." menu on any video and select "Report." Every report is reviewed.
- **Blocking:** You can block any user at any time. Blocked users cannot see your content or interact with you.
- **Review process:** Our team reviews reported content and may remove it if it violates these guidelines.
- **Consequences:** Depending on the severity and frequency of violations, we may:
  - Remove the content
  - Issue a warning
  - Temporarily suspend your account
  - Permanently ban your account
- **Appeals:** If you believe your content was removed in error, contact us at support@lewreviews.app.

---

## A Note on Debate

LewReviews is built around agree/disagree. Strong opinions are welcome — that's the whole point. You can think a movie is trash and say so. You can disagree with someone's take passionately. What you can't do is make it personal, hateful, or harmful.

**The line is simple: debate the movie, not the person.**

---

## Contact Us

If you have questions about these guidelines, contact us at support@lewreviews.app.`;

export default function CommunityGuidelinesScreen() {
  return <LegalScreen title="Community Guidelines" content={COMMUNITY_GUIDELINES} />;
}
