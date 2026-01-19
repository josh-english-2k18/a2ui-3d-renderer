# Repository Guidelines

## Project Structure & Module Organization
- `App.tsx` hosts the main UI; `index.tsx` is the Vite entry point.
- `components/` contains React/Three rendering pieces (e.g., `Renderer3D.tsx`, `A2UINode.tsx`).
- `services/` contains stream and layout helpers (`mockStream.ts`, `layoutEngine.ts`).
- `types.ts` centralizes shared TypeScript types.
- `index.html`, `vite.config.ts`, `tsconfig.json` define runtime and tooling.
- `metadata.json` and `screenshot.png` hold repo metadata and visuals.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run dev` starts the Vite dev server locally.
- `npm run build` produces a production build in `dist/`.
- `npm run preview` serves the `dist/` build for quick validation.
- No automated test command is configured.

## Coding Style & Naming Conventions
- Use TypeScript + React (ES modules); keep import groups tidy.
- Indent 2 spaces, use semicolons, prefer single quotes.
- Components and types use `PascalCase` (`Renderer3D`, `StreamMessage`); functions and hooks use `camelCase`.
- Tailwind utility strings are in `className`; wrap or split long strings for readability.

## Testing Guidelines
- No test framework is set up. If you add tests, document the runner in `package.json` and place files as `*.test.ts(x)` alongside modules or under a new `tests/` folder.

## Commit & Pull Request Guidelines
- No git history is present here, so no established commit format. Use short, imperative subjects (e.g., "Add postprocessing bloom") and include detail in the body when helpful.
- PRs should explain intent, list notable changes, and include screenshots or screen recordings for UI/visual updates.

## Configuration & Secrets
- Create `.env.local` with `GEMINI_API_KEY=...` for local runs; never commit secrets.
