# X.com Thread Draft — Launch Post

## Tweet 1 (Hook)
🧵 I told an AI agent to build a cozy forest exploration game from scratch.

No hand-coded anything. 118 specialized skills. 3 asset APIs. One prompt.

Here's what it built in 5 minutes 👇

[attach: v0-baseline.png]

## Tweet 2 (The Setup)
The agent: Hermes Agent by @NousResearch
The approach: Game-director pipeline with 7 phases
- Design brief
- Gameplay systems
- Asset generation (Gemini, Tripo, ElevenLabs)
- Graphics pass
- UI/HUD
- QA testing
- Scoring & iteration

15 TypeScript files. ~1,100 lines. Zero manual code.

## Tweet 3 (What It Got Right)
What surprised me:
• Clean architecture (entities/systems/core separation)
• Golden hour lighting with proper shadow mapping
• Canvas-generated forest floor with grass, leaves, moss
• Mobile touch controls + WASD keyboard
• 120+ firefly particles with pulsing glow
• Day/night cycle
• Oscillator-based audio (no audio files needed)

## Tweet 4 (What's Basic)
What needs work:
⚠️ All procedural geometry — boxes and cones, no real 3D models
⚠️ Trees are stacked cones (recognizable but basic)
⚠️ No post-processing (bloom, vignette)
⚠️ No particle effects when you collect items
⚠️ No ambient forest sounds
⚠️ Mushrooms are just red spheres

This is v0. We're iterating.

## Tweet 5 (The Prompt)
The exact prompt that built this:

"Build a premium cozy forest exploration game called Whisperwood. Player character walks through a magical forest. Collect mushrooms, flowers, fireflies, crystals. Warm, natural aesthetic — golden hour lighting, forest greens, amber tones. Think Studio Ghibli meets pixel art warmth but in 3D."

That's it. That's the whole creative brief.

## Tweet 6 (What's Next)
Next iteration:
🎯 Real 3D models from Tripo API
🎯 Post-processing (bloom, vignette, color grading)
🎯 Collect particle burst effects
🎯 Ambient forest audio from ElevenLabs
🎯 Better tree geometry

Each iteration gets screenshotted, scored across 10 categories, and posted here.

Follow along 👇

#AI #ThreeJS #GameDev #AgenticCoding #WebDev #NousResearch

## Tweet 7 (CTA)
Want to see the full codebase? It's on GitHub: [link]

Want to try the game? Live at: [Vercel URL]

Want to build your own? Hermes Agent is free and open source.

What should the AI add next? Drop ideas below 👇
