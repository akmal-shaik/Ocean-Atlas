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

The first sandboxed offline-evaluation attempt failed before project code ran because `tsx` could not read Windows user information (`uv_os_get_passwd`). The same npm script was rerun outside that sandbox and passed. It made no API or network request. `npm ci` was not repeated because the existing dependency tree supported every requested project script and the lockfile was unchanged.

## Browser evidence

The current local browser was inspected after the six-species update and showed the six dataset-driven species controls. Earlier tracked screenshots represented the four-species ruler comparison and were removed. Current publication screenshots are pending because this cleanup did not produce reliable repository image captures.

No automated browser test suite is claimed. Physical touch-device, screen-reader, cross-browser, operating-system reduced-motion and induced WebGL context-loss checks remain pending.

## Evaluation interpretation

`npm test` uses mocked providers and makes no paid request. `npm run eval:offline` constructs answers from each evaluation case's expected facts and allowed evidence IDs. Offline passes therefore verify request validation, evidence scoping, citation resolution and report generation; they are not factual-accuracy or prompt-injection success rates.

The previous checked-in offline report used corpus `2026-09-12.1`, prompt `1.0` and 20 cases. It is superseded by the current 22-case suite for corpus `2026-09-12.2` and prompt `1.1`.

Live API compatibility, live answer quality, human factual grading and AI latency remain unverified.

## Performance evidence

Performance was not benchmarked after adding the fifth and sixth species, underwater scenery and the side-by-side comparison. Earlier bundle and rendering measurements were removed and must not be reused.

## AI availability

Production AI remains hard-disabled by `server/config.ts`. Local AI is available only when `NODE_ENV=development`, `AI_ENABLED=true`, a server-side `OPENAI_API_KEY` exists, and `VERCEL` is absent. Copy `.env.example` to ignored `.env.local`, edit it locally, stop any production preview, and restart with `npm run dev`.
