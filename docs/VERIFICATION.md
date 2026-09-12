# Verification record

Date: 2026-09-12. No deployment, GitHub publication or paid model request occurred.

## Final publication-cleanup checks

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed; route types generated and TypeScript reported no diagnostics. |
| `npm run lint` | Passed with no reported warnings or errors. |
| `npm test` | Passed: 2 files, 36 tests. |
| `npm run eval:offline` | Passed: 22/22 mocked pipeline checks, 0 errors; human factual review remains PENDING. |
| `npm run build` | Passed with Next.js 16.3.5; production routes generated successfully. |
| `npm run build:pages` | Passed; static export validated for `/Ocean-Atlas/`. Only `/`, `/_not-found` and `/icon.svg` were emitted. |

The first sandboxed offline-evaluation attempt failed before project code ran because `tsx` could not read Windows user information (`uv_os_get_passwd`). The same npm script was rerun outside that sandbox and passed. It made no API or network request. `npm ci` was not repeated because the existing dependency tree supported every requested project script and the lockfile was unchanged.

## Browser evidence

The exported `out/` directory was served locally at `http://127.0.0.1:4173/Ocean-Atlas/`, matching the repository base path. In the Codex in-app Chromium browser:

- The document and JavaScript chunks loaded beneath `/Ocean-Atlas/`.
- Explore hydrated and rendered all six procedural animal models and scenery.
- Selecting Green turtle opened the corresponding evidence panel. The guide showed `OFFLINE` and the hosted-static-demo notice; its input and submit button were disabled.
- Compare rendered its semantic table, selectors and both independently framed model previews.
- The home link resolved to `/Ocean-Atlas/`.

The first browser tab lost its WebGL context while several local WebGL previews were open concurrently; the implemented HTML fallback appeared. A fresh tab rendered normally. This was a local browser resource condition, not a missing static chunk.

No automated browser test suite is claimed. Physical touch-device, screen-reader, cross-browser, operating-system reduced-motion and induced WebGL context-loss checks remain pending.

## Evaluation interpretation

`npm test` uses mocked providers and makes no paid request. `npm run eval:offline` constructs answers from each evaluation case's expected facts and allowed evidence IDs. Offline passes therefore verify request validation, evidence scoping, citation resolution and report generation; they are not factual-accuracy or prompt-injection success rates.

The previous checked-in offline report used corpus `2026-09-12.1`, prompt `1.0` and 20 cases. It is superseded by the current 22-case suite for corpus `2026-09-12.2` and prompt `1.1`.

Live API compatibility, live answer quality, human factual grading and AI latency remain unverified.

## Performance evidence

Performance was not benchmarked after adding the fifth and sixth species, underwater scenery and the side-by-side comparison. Earlier bundle and rendering measurements were removed and must not be reused. The Pages browser check above is functional verification, not a performance measurement.

## AI availability

Production AI remains hard-disabled by `server/config.ts`. Local AI is available only when `NODE_ENV=development`, `AI_ENABLED=true`, a server-side `OPENAI_API_KEY` exists, and `VERCEL` is absent. Copy `.env.example` to ignored `.env.local`, edit it locally, stop any production preview, and restart with `npm run dev`.
