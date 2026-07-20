# Whisperwood v2

Cozy forest exploration game — collect mushrooms, flowers, fireflies, and crystals in a magical forest.

## Tech Stack

- Three.js + TypeScript
- Vite (dev server)
- Playwright (metrics harness)
- AI-generated assets (Gemini, Tripo, ElevenLabs)

## Development

```bash
npm install
npm run dev
```

## Metrics Harness

```bash
python3 scripts/collect-metrics.py whisperwood-v2 $(git rev-parse HEAD) dist/
python3 scripts/trace-fps.py --url http://localhost:5173 --duration 30
python3 scripts/screenshot-diff.py --url http://localhost:5173
python3 scripts/collect-evidence.py --game whisperwood-v2 --commit $(git rev-parse HEAD)
```

## CI

Every push runs:
- Build verification (Vite production build)
- Metrics harness (real output, not agent claims)
- Artifact upload (metrics stored for 30 days)
