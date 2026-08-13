# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# @sankara-ui/core

Published npm package of shared React components for sankara:interactive projects
(Next 16 App Router + Tailwind v4 consumers). No bundler: `tsc` emits `dist`
one-file-per-source, so what's in `src` is what ships.

## Commands

- `yarn check` — the CI gate: `typecheck` + `test` + `build`. Run before any PR.
- `yarn test` — vitest (jsdom). Single file: `yarn vitest run src/components/Icon.test.tsx`. Watch: `yarn vitest`.
- `yarn build` — `tsc -p tsconfig.build.json`, then `scripts/copy-styles.mjs`, then `scripts/check-directives.mjs`.
- `yarn storybook` — dev server on :6006. Stories are `src/**/*.stories.tsx`.
- Node 22.14.0, Yarn 4 via corepack.

## Architecture

- **Native platform element first — markup included.** Before reaching for a
  headless library or React state, check whether HTML already does it:
  `<details>/<summary>` for disclosure (including exclusive accordions via
  `name`), `<dialog>` for modals, `<input type="date">` over a picker. Native
  keeps the component a server component, ships no JavaScript, and gets the
  keyboard and ARIA contract right by construction. Base UI is the documented
  fallback for what the platform genuinely lacks — not the default.
- **Public surface is `src/index.ts`, plus `Icon`.** A component not re-exported
  from the barrel is invisible to consumers. Three export paths exist in
  `package.json`: `.` (JS), `./icon` (→ `dist/components/Icon.js`) and
  `./styles.css` (→ `dist/styles.css`). `Icon` is out of the barrel on purpose —
  ESM re-exports are eager, so a barrel that names it drags the optional
  FontAwesome peers into every consumer, and importing the package fails outright
  where they aren't installed. Any future component with an optional peer gets
  the same treatment; nothing else does.
- **Relative imports must carry the `.js` extension** (`../utilities/cn.js`) even
  from `.ts` sources — `module: nodenext` + `verbatimModuleSyntax`. Extensionless
  imports fail typecheck, and would break consumers' ESM resolution.
- **`'use client'` must be the first line of any file using hooks/handlers**
  (`Carousel.tsx` does; `Icon.tsx` deliberately doesn't, so it stays an RSC).
  `scripts/check-directives.mjs` fails the build if a source declares it and the
  emitted `dist` file lost it.
- **Token contract, three places in sync:** `src/styles/tokens.ts` (`TOKENS`
  array), `src/styles/tokens.css` (`@theme` defaults), and the README table.
  `src/styles/tokens.test.ts` fails if a `TOKENS` entry has no CSS default.
  Components style themselves through these tokens (`bg-primary`,
  `rounded-card`, …) — never hardcode colours or radii.
- **Peer range spans FontAwesome 6 and 7.** Behaviour differs between them
  (see the `role` comment in `Icon.tsx`); don't "simplify away" accommodations
  for the version that isn't installed locally.
- **Consumers add `@source ".../@sankara-ui/core/dist/components";`** — Tailwind
  v4 doesn't scan `node_modules`. Since 0.9.0 only `Icon` needs it; pointed at
  the package root instead, Tailwind scans `README.md` and emits utilities for
  class names that exist only in prose. Keep the README install block accurate
  when class usage changes.

## Roadmap and scope

Each repo owns its own specs — this package's live in `docs/specs/`. The
originating docs predate this repo and stay in `next-storyblok-template`:
`docs/enhancement-roadmap.md` (Track B is this package),
`docs/superpowers/specs/2026-07-29-sankara-ui-design.md` (decisions + the
five-project survey the catalogue is derived from), and
`docs/superpowers/plans/2026-07-29-sankara-ui-first-release.md`. Read the design
spec before adding a component. Binding constraints from it:

- **Evidence beats specification.** The catalogue comes from five shipped
  projects (numbers.ch, fgpfister.ch, fairmed.ch-sb, nuwa.swiss,
  brillen-werk.ch). Don't add a component because a design system usually has
  one. `Reveal`, `CountUp`, `Glow`, `BgMark`, `Pill`, `IconBox` are explicitly
  out — single-project visual language.
- **Base UI** (`@base-ui-components/react`) is the design spec's headless
  foundation, used *only* where a component needs it — still not a dependency.
  `Icon` and `Carousel` need nothing, and `docs/specs/2026-08-01-disclosure-design.md`
  moves Disclosure to native `<details>`; `<dialog>` is expected to do the same
  for Dialog. If Popover and Menu also land native, reopen that decision rather
  than leaving it as an unused one.
- **Prohibited:** Storyblok packages, generated CMS types, data fetching. CMS
  adaptation is the template's job. `next/image` and `next/link` are the only
  Next surfaces permitted, and `next` becomes a peer dep only when an
  image-bearing component ships.
- Stay on `0.x` until the template consumes the package end to end. Visual
  regression testing is deliberately sequenced after the first release.

## Release

Changesets. Any user-facing change needs `yarn changeset` committed alongside it;
merging to `main` opens/updates a Version Packages PR, and merging that publishes
to npm. `dist` is gitignored and built at pack time via `prepack`.

## Workflow

- Feature branches only, never commit on `main`; ask before pushing.
- CI also runs a packaging smoke test that packs the tarball, installs it into a
  clean project, and asserts both entry points resolve — breaking `exports`,
  `files`, or the `dist` layout fails there, not in `yarn check`.
