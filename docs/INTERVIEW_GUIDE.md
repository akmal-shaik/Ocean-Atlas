# Interview guide

## Thirty-second explanation

“Ocean Atlas is a six-species full-stack marine field guide. Explore mode uses procedural WebGL models and accessible HTML controls; Compare presents local source-backed facts in an aligned table. The optional local AI path selects evidence by species, requests structured output and validates citation IDs on the server. Automated tests and mocked offline evaluations verify pipeline behaviour, while live answer accuracy still requires a paid run and human factual review.”

Describe the project as AI-assisted and discuss only behaviour you can demonstrate. Do not claim model training, semantic retrieval, production AI readiness or measured live accuracy.

## Browser, graphics and data

Start at `app/page.tsx`, then read `components/Explorer.tsx`. The server passes one availability boolean to the client. `Explorer` owns selection and mode state, derives field notes from `lib/corpus.ts`, and dynamically loads the WebGL scene and comparison previews without server rendering.

Mesh clicks and accessible HTML buttons use the same species-ID selection callback. Hover or keyboard focus reveals contextual labels; selecting an animal keeps its label visible. `CameraRig` derives framing from the selected species and viewport. Explore uses disclosed display-friendly sizes; Compare previews are independently framed and labelled “Not to scale.”

`Animals.tsx` constructs six recognisable low-poly silhouettes. `useFrame` mutates refs for swimming, fins, tentacles and jelly pulsing without per-frame React state. `OceanScene.tsx` adds procedural seabed, coral, seaweed and a decorative fish school. Pause and reduced-motion settings stop time-based movement.

`lib/corpus.ts` validates 6 species, 9 sources and 35 evidence records at import time. Each species must have overview, size, habitat, diet and fact evidence, and every source reference must resolve. Measurement definitions preserve maxima, adult-range bounds and body-part differences rather than presenting them as equivalent.

## AI boundary and evaluation

Follow `/api/ask` through `server/runtime.ts`, `server/pipeline.ts` and `server/openai.ts`. The browser supplies only a question and one or two known species IDs. Strict validation rejects browser-supplied evidence or instructions. Retrieval filters records for the selected species in stable round-robin order under a byte budget; it is deterministic filtering, not vector or semantic search.

The model returns structured answer text, evidence IDs and an insufficient-evidence flag. The server rejects unknown or out-of-scope IDs and resolves citation text and URLs from the corpus. This prevents model-generated source links, but it cannot prove that a claim follows from a valid citation.

Unit tests use mocked providers to cover validation, retrieval, invalid citations, malformed output, timeouts, safe errors and production gating. The 22-case offline runner also uses mocked answers assembled from expected case facts. Its passes demonstrate pipeline/report plumbing only. A live run followed by claim-by-claim human review is required for model-quality evidence.

Production AI is intentionally disabled because request bounds do not prevent aggregate abuse. A public paid endpoint would first need authentication or deployment-supported durable rate limiting.

## Performance language

DPR is capped at 1.5 and the scene avoids textures, shadows and post-processing. Current performance has not been benchmarked after the six-species and scenery changes. Do not reuse older frame-time, triangle, draw-call or bundle figures.

## Three hands-on exercises

1. Trace green-turtle selection from the HTML button or mesh callback through `selected`, `evidenceFor`, `CameraRig` and the information panel. Explain which values come from React state and which come from the corpus.
2. Temporarily make a mocked salmon answer cite `tuna.diet`, run the targeted pipeline test, explain why validation rejects it, then revert the edit.
3. Read evaluation cases F11 and F12. Explain the measurement qualifiers, run `npm run eval:offline`, and explain why a mocked pass does not establish that a live model will preserve those qualifiers.
