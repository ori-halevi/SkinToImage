# SkinToImage

Turn a Minecraft-style skin into transparent, thumbnail-ready PNG renders — entirely in the browser.

> Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.

## Development

```bash
npm install
npm run dev      # dev server
npm test         # unit tests
npm run build    # type-check + production build to dist/
```

## Deploy (GitHub Pages)

1. Push the repo to GitHub (branch `main`).
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Every push to `main` runs tests, builds, and deploys via [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

## Project layout

| Path | What |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | Product spec (Hebrew) |
| `src/render/rig/` | Character model: part layout, UV-mapped box geometry |
| `src/render/renderPose.ts` | Render pipeline: pose → camera fit → WebGL → outline → trim → PNG |
| `src/render/postprocess/` | Outline (distance transform) and auto-trim — pure, unit-tested |
| `src/data/poses/*.json` | Pose definitions (joint rotations in degrees) |
| `src/features/` | Skin loading, export, and UI |
