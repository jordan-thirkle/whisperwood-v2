# Whisperwood — Build Journey Content Log

## What This Is
A cozy forest exploration game built entirely by AI (Hermes Agent by Nous Research) using 118 specialized skills, 3D asset APIs (Gemini, Tripo, ElevenLabs), and the Three.js game-director pipeline. Documented for X.com to share the AI coding workflow.

## The Story
**Day 1 (July 14, 2026):** Started with a blank Vite scaffold. 15 TypeScript files. No manual code written.

---

## v0 — Baseline (Current)
**Screenshot:** `screenshots/v0-baseline.png`
**Lines of code:** ~1,100 across 15 files
**Build time:** ~5 minutes (code generation only)
**What's there:**
- Forest spirit player (golden body, leaf hat, glow ring)
- 15 collectibles (mushrooms, flowers, crystals, firefly clusters)
- 30+ trees (layered cone canopy), 25 bushes, 15 rocks
- 120+ firefly particles with pulsing glow
- Golden hour lighting (hemisphere + directional + fill)
- Canvas-generated forest floor texture (grass, leaves, moss)
- Day/night cycle
- Mobile touch controls + WASD
- Oscillator-based pickup sounds
- HUD with score, timer, status

**Brutally honest assessment:**
- ✅ Architecture is clean (entities/systems/core separation)
- ✅ Lighting is warm and atmospheric
- ✅ Mobile responsive
- ⚠️ All procedural geometry — no real 3D models
- ⚠️ No post-processing (bloom, vignette)
- ⚠️ No particle effects on collect
- ⚠️ No ambient forest audio
- ⚠️ Trees are cone stacks — recognizable but basic

**What's missing for AAA:**
1. Real 3D models from Tripo API
2. Post-processing pipeline (bloom, vignette, color grading)
3. Collect particle burst effects
4. Ambient forest audio (ElevenLabs)
5. Screen shake on collect
6. Better tree models (branching, leaves)
7. Ground texture variation
8. Water/stream feature
9. Save system
10. Settings menu

---

## Iteration Plan
Each iteration will:
1. Screenshot BEFORE changes
2. Make targeted improvements
3. Screenshot AFTER changes
4. Score across 10 categories (0-3)
5. Document what changed and why
6. Draft X.com post with before/after

## X.com Content Strategy
**Account:** @jordan-thirkle (or new AI-focused account?)
**Thread format:**
- Hook: "I told an AI to build a cozy forest game from scratch"
- Before/after screenshots
- Exact prompts used
- What the AI got right vs wrong
- Technical breakdown for devs
- Call to action: "What should it add next?"

**Posting cadence:** 1 thread per major iteration
**Hashtags:** #AI #ThreeJS #GameDev #AgenticCoding #NousResearch #WebDev
