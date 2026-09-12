import { it, expect } from "vitest";
import { cases, caseSchema } from "../evaluation/cases";
import { corpus } from "../lib/corpus";
it("has exactly the required 22 evaluation cases with valid scoped references", () => {
  expect(cases).toHaveLength(22);
  for (const [category, count] of Object.entries({
    factual: 12,
    comparison: 4,
    unanswerable: 4,
    injection: 2,
  }))
    expect(cases.filter((c) => c.category === category)).toHaveLength(count);
  expect(new Set(cases.map((c) => c.id)).size).toBe(22);
  for (const c of cases) {
    expect(caseSchema.safeParse(c).success).toBe(true);
    for (const id of c.allowedEvidenceIds)
      expect(
        corpus.evidence.some(
          (e) => e.id === id && c.speciesIds.includes(e.speciesId),
        ),
      ).toBe(true);
  }
});
