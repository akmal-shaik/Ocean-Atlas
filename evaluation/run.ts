import { mkdir, writeFile } from "node:fs/promises";
import { corpus } from "../lib/corpus";
import {
  answerQuestion,
  PROMPT_VERSION,
  retrieve,
  type Provider,
} from "../server/pipeline";
import { openAIProvider } from "../server/openai";
import { cases } from "./cases";
async function main() {
  const live = process.argv.includes("--live");
  const model = live
    ? process.env.OPENAI_MODEL || "gpt-4.1-mini"
    : "offline-fixture";
  if (live && !process.env.OPENAI_API_KEY)
    throw new Error(
      "Live evaluation needs OPENAI_API_KEY in local environment; never paste it into chat.",
    );
  console.log(
    live
      ? `LIVE PAID evaluation: ${cases.length} sequential API calls, no retries.`
      : "MOCKED OFFLINE pipeline checks: exercises plumbing only. No model accuracy score.",
  );
  const results = [];
  for (const test of cases) {
    const start = performance.now();
    let metadata: Record<string, unknown> = {};
    // Deliberately labelled fixture; never imported by the application.
    const mock: Provider = async () => ({
      output: {
        answer: test.expectedAbstention
          ? "This collection cannot answer that question."
          : test.expectedFacts.join(". "),
        evidenceIds: test.allowedEvidenceIds,
        insufficientEvidence: test.expectedAbstention,
      },
    });
    try {
      const answer = await answerQuestion(
        { speciesIds: test.speciesIds, question: test.question },
        live ? openAIProvider(process.env.OPENAI_API_KEY, model) : mock,
        {
          model,
          onMetadata: (m) => {
            metadata = m;
          },
        },
      );
      const retrieved = retrieve({
        speciesIds: test.speciesIds,
        question: test.question,
      });
      const automated = {
        schema: true,
        evidenceIdsValid: answer.evidenceIds.every((id) =>
          retrieved.some((e) => e.id === id),
        ),
        scopedRetrieval: retrieved.every((e) =>
          test.speciesIds.includes(e.speciesId),
        ),
        expectedAbstention:
          answer.insufficientEvidence === test.expectedAbstention,
        caseEvidenceAllowed: answer.evidenceIds.every((id) =>
          test.allowedEvidenceIds.includes(id),
        ),
      };
      results.push({
        id: test.id,
        category: test.category,
        question: test.question,
        answer,
        automated,
        latencyMs: Math.round(performance.now() - start),
        metadata,
        humanReview: "PENDING",
        rubric: test.rubric,
        expectedFacts: test.expectedFacts,
      });
    } catch (error) {
      results.push({
        id: test.id,
        error:
          error instanceof Error ? error.message : "Unknown pipeline error",
        latencyMs: Math.round(performance.now() - start),
        metadata,
        humanReview: "NOT_REVIEWABLE",
      });
    }
  }
  const date = new Date().toISOString();
  const success = results.filter((r) => "automated" in r);
  const latencies = success.map((r) => r.latencyMs).sort((a, b) => a - b);
  const median = latencies.length
    ? (latencies[Math.floor((latencies.length - 1) / 2)] +
        latencies[Math.floor(latencies.length / 2)]) /
      2
    : null;
  const report = {
    mode: live ? "live" : "mocked-offline-pipeline-checks",
    model,
    date,
    corpusVersion: corpus.version,
    promptVersion: PROMPT_VERSION,
    errors: results.length - success.length,
    automatedPasses: success.filter((r) =>
      Object.values(r.automated!).every(Boolean),
    ).length,
    humanAccuracy: "PENDING — no factual accuracy score",
    medianLatencyMs: median,
    results,
  };
  await mkdir("evaluation/results", { recursive: true });
  const prefix = `evaluation/results/${live ? "live" : "offline"}-${date.replace(/[:.]/g, "-")}`;
  await writeFile(`${prefix}.json`, JSON.stringify(report, null, 2));
  const summary = `# Ocean Atlas evaluation\n\nMode: ${report.mode}\nModel: ${model}\nDate: ${date}\nCorpus: ${corpus.version}; prompt: ${PROMPT_VERSION}\n\n${live ? "Live model responses were sent through the pipeline." : "These results use mocked answers assembled from each case's expected facts. They verify pipeline and report plumbing only; they are not model-accuracy results."}\n\nAutomated pipeline checks: ${report.automatedPasses}/${cases.length}. Errors: ${report.errors}.\nMedian ${live ? "API pipeline" : "mock fixture"} latency: ${median} ms.\nHuman factual review: PENDING. Citation validity is not factual accuracy.\n\n${results.map((r) => `- ${r.id}: ${"error" in r ? `ERROR ${r.error}` : Object.values(r.automated!).every(Boolean) ? "automated checks passed" : "automated check failed"}; human review ${r.humanReview}`).join("\n")}\n\nReview live JSON answers against the corpus; grade each substantive claim and relevance with each case rubric.\n`;
  await writeFile(`${prefix}.md`, summary);
  console.log(summary);
  console.log(`Saved ${prefix}.{json,md}`);
  if (report.errors || report.automatedPasses !== cases.length)
    process.exitCode = 1;
}
main().catch(() => {
  console.error(
    "Evaluation could not run. Check local configuration. No model scores recorded.",
  );
  process.exitCode = 1;
});
