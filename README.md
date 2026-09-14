# SkinToImage

Turn a Minecraft-style skin into transparent, thumbnail-ready PNG renders — entirely in the browser.

> Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.

## Development

```bash
npm install
npm run dev        # dev server
npm test           # unit tests (Vitest)
npm run test:e2e   # end-to-end tests (Playwright; builds must exist: run `npm run build` first)
npm run build      # type-check + production build to dist/
```

## Deploy (GitHub Pages)

1. Push the repo to GitHub (branch `main`).
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Every push to `main` runs tests, builds, and deploys via [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

## Project layout

| Path | What |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | Product spec (Hebrew) |
| `src/render/renderShot.ts` | Render pipeline: actors + props → camera fit → WebGL → outline → trim → shadow/glow → frame → PNG |
| `src/render/rig/` | Character model: part layout, UV-mapped box geometry, held items |
| `src/render/props/` | Original pixel-art items and block textures, generated in code |
| `src/render/postprocess/` | Outline (distance transform), trim, effects, background frames |
| `src/data/poses/*.json` | Pose definitions (joint rotations in degrees) |
| `src/data/scenes.ts` | Multi-character scenes with props |
| `src/features/` | Skin loading (file / username), studio UI, export |
