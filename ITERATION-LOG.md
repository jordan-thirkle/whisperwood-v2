# Whisperwood — Iteration Log

## Scoring Rubric

Every iteration is scored across 10 categories on a 0-3 scale:

| Score | Meaning |
|-------|---------|
| 0 | Not present |
| 1 | Basic/prototype — functional but rough |
| 2 | Solid — meets expectations, feels intentional |
| 3 | Excellent — polished, AAA-quality, delightful |

**Target:** Average ≥ 2.3, no category below 2.

---

## Pipeline Phases

Each iteration follows the 7-phase game-director pipeline:

1. **Design Brief** — Player promise, target feeling, primary verbs
2. **Gameplay Systems** — Architecture, entities, core loop
3. **Asset Generation** — Procedural geometry or API-generated 3D models
4. **Graphics Pass** — Lighting, materials, post-processing
5. **UI/HUD** — Interface, mobile controls, feedback
6. **QA Testing** — Playwright + custom hooks, visual verification
7. **Scoring & Iteration** — Rubric scoring, screenshot, plan next

---

## v0 — Baseline (July 14, 2026)

### What Was Built

17 TypeScript source files, ~1,100 lines. Zero manual code.

**Entities:**
- Forest spirit player: golden body, leaf hat, glow ring, smooth movement
- 15 collectibles: mushrooms (red), flowers (pink), crystals (blue), firefly clusters (gold)
- Each pickup has bobbing animation and type-specific color

**Systems:**
- InputController: WASD keyboard + mobile touch joystick + dash button
- AudioSystem: Web Audio oscillator sounds (no audio files)
- CameraRig: Smooth follow with configurable lag (0.16)
- CollisionSystem: Distance-based pickup collection (radius 0.7)
- CollectEffect: Pooled particle bursts (5 pools, 24 particles each)
- PostProcessing: Bloom + vignette + chromatic aberration
- Hud: DOM-based score/timer/status display
- DebugTools: lil-gui tuning panel
- Game: 556-line orchestrator class

**Environment:**
- Canvas-generated forest floor (512x512 texture: grass, leaves, moss)
- 30+ trees (layered cone canopy, cylinder trunk)
- 25 bushes (sphere geometry)
- 15 rocks (dodecahedron geometry)
- 120+ firefly particles (3 point clouds, additive blending, pulsing glow)
- Day/night cycle (slow fog color interpolation)

**Lighting:**
- Hemisphere light (warm sky #f6e8c8 / green ground #2d4a2d, intensity 1.2)
- Directional sunlight (warm #ffe4a0, intensity 2.2, 2048 shadow map)
- Fill light (cool blue #b8d4e8, intensity 0.4)
- ACES tone mapping, PCF shadow maps

**Scoring:**

| # | Category | Score | Notes |
|---|----------|-------|-------|
| 1 | Art Direction | 2 | Warm color palette, golden hour feel |
| 2 | Hero/Player | 2 | Forest spirit with personality |
| 3 | Obstacles | 1 | No obstacles yet, just open exploration |
| 4 | Rewards | 2 | 4 pickup types with distinct visuals and animations |
| 5 | World | 2 | Trees, bushes, rocks, fireflies, day/night |
| 6 | Materials | 1 | Procedural geometry, canvas textures only |
| 7 | Lighting | 2 | Golden hour, shadows, fog, ACES tone mapping |
| 8 | VFX | 1 | Firefly particles, no collect effects |
| 9 | UI/HUD | 2 | Clean HUD, mobile responsive |
| 10 | Performance | 3 | Clean build, 60fps target, proper disposal |

**Average: 1.8 / 3.0**

### What's Working

- ✅ Clean architecture (entities/systems/core separation)
- ✅ Golden hour lighting with proper shadow mapping
- ✅ Mobile touch controls from day one
- ✅ Seeded RNG for reproducible scenes
- ✅ Test hooks for Playwright automation
- ✅ Full disposal pattern (no memory leaks)
- ✅ Post-processing pipeline (bloom, vignette, chromatic aberration)
- ✅ Collect particle burst effects (pooled, color-matched)

### What's Missing

| Gap | Current | Target |
|-----|---------|--------|
| Obstacles | None | Forest hazards, moving enemies |
| Materials | Procedural | Real 3D models (Tripo API) |
| VFX | Basic particles | Screen shake, trail effects, ambient particles |
| Trees | Cone stacks | Branching geometry, leaf detail |
| Audio | Oscillator tones | Ambient forest sounds (ElevenLabs) |
| Ground | Single texture | Variation, paths, water features |
| Save system | None | Score persistence, settings |
| Settings | None | Volume, quality, controls |

---

## v1 — Planned

### Priority Changes

1. **Post-processing improvements** — Bloom tuning, color grading, tone mapping adjustments
2. **Collect effects** — Enhanced particle bursts, screen shake on pickup
3. **Better trees** — Branch geometry, leaf variation, dead trees
4. **Audio** — Ambient forest audio layer, collect sounds refinement
5. **Obstacle introduction** — First enemy/hazard type

### Target Scores

| # | Category | v0 | v1 Target |
|---|----------|----|-----------|
| 1 | Art Direction | 2 | 2 |
| 2 | Hero/Player | 2 | 2 |
| 3 | Obstacles | 1 | 2 |
| 4 | Rewards | 2 | 2 |
| 5 | World | 2 | 2 |
| 6 | Materials | 1 | 1 |
| 7 | Lighting | 2 | 2 |
| 8 | VFX | 1 | 2 |
| 9 | UI/HUD | 2 | 2 |
| 10 | Performance | 3 | 3 |

**v1 target average: ≥ 2.0** (step toward 2.3)

### What v1 Won't Do

- No real 3D models yet (v2+ for Tripo integration)
- No save system (v3+)
- No settings menu (v3+)
- No water/stream feature (v2+)

---

## Iteration Protocol

Each iteration:

1. **Screenshot BEFORE** — Capture current state
2. **Make changes** — Targeted improvements only
3. **Screenshot AFTER** — Compare before/after
4. **Score** — Rate all 10 categories honestly
5. **Document** — Update this log with changes and reasoning
6. **Share** — Draft X.com post with before/after

### Screenshot Locations

- `screenshots/v0-baseline.png` — v0 baseline capture
- `screenshots/v1-*.png` — (planned)

---

## Long-Term Roadmap

| Version | Focus | Target Average |
|---------|-------|---------------|
| v0 | Architecture + basic visuals | 1.8 |
| v1 | Post-processing, collect effects, audio | ≥ 2.0 |
| v2 | Real 3D models, ground variation, water | ≥ 2.3 |
| v3 | Obstacles, save system, settings | ≥ 2.5 |
| v4+ | Polish, AAA features, content | ≥ 2.7 |
