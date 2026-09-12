import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { corpus, corpusSchema } from "../lib/corpus";
import { requestSchema } from "../lib/contracts";
import {
  retrieve,
  validateAnswer,
  answerQuestion,
  CONTEXT_BYTES,
  type Provider,
} from "../server/pipeline";
import { openAIProvider } from "../server/openai";
import { aiAvailable } from "../server/config";
import { POST, readBody } from "../app/api/ask/route";
const question = { speciesIds: ["salmon"], question: "What does it eat?" };
const valid = {
  answer: "Salmon eat fish at sea.",
  evidenceIds: ["salmon.diet"],
  insufficientEvidence: false,
};
const provider: Provider = async () => ({ output: valid });
describe("corpus", () => {
  it("validates all species, sources, and evidence", () =>
    expect(corpusSchema.safeParse(corpus).success).toBe(true));
  it("rejects broken references and duplicates", () => {
    const copy = structuredClone(corpus);
    copy.evidence[0].sourceIds = ["missing"];
    copy.sources.push(copy.sources[0]);
    expect(corpusSchema.safeParse(copy).success).toBe(false);
  });
  it("labels every comparison measurement basis", () => {
    expect(
      corpus.species.every((s) => s.size.basis.startsWith("reported")),
    ).toBe(true);
    expect(
      corpus.species.find((s) => s.id === "green-turtle")?.size.basis,
    ).toBe("reported adult upper bound");
  });
});
describe("requests and retrieval", () => {
  it.each([
    { ...question, speciesIds: ["unknown"] },
    { ...question, question: "" },
    { ...question, question: " " },
    { ...question, question: "x".repeat(801) },
    { ...question, speciesIds: [] },
    { ...question, speciesIds: ["salmon", "salmon"] },
    { ...question, speciesIds: ["salmon", "tuna", "squid"] },
    { ...question, evidence: "browser facts" },
  ])("rejects invalid requests %j", (input) =>
    expect(requestSchema.safeParse(input).success).toBe(false),
  );
  it("scopes one species", () =>
    expect(retrieve(question).every((e) => e.speciesId === "salmon")).toBe(
      true,
    ));
  it("scopes two species within budget deterministically", () => {
    const q = { ...question, speciesIds: ["salmon", "squid"] };
    const result = retrieve(q);
    expect(new Set(result.map((e) => e.speciesId))).toEqual(
      new Set(["salmon", "squid"]),
    );
    expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThanOrEqual(
      CONTEXT_BYTES,
    );
    expect(result).toEqual(retrieve(q));
  });
});
describe("answers", () => {
  it("resolves source URLs from corpus", async () => {
    const result = await answerQuestion(question, provider);
    expect(result.citations[0].sources[0].url).toContain("fisheries.noaa.gov");
  });
  it.each(["invented", "tuna.diet"])(
    "rejects invalid/out-of-scope citation %s",
    (id) =>
      expect(() =>
        validateAnswer({ ...valid, evidenceIds: [id] }, retrieve(question)),
      ).toThrow("invalid_answer"),
  );
  it.each([
    null,
    {},
    "bad",
    { ...valid, answer: "" },
    { ...valid, evidenceIds: [] },
    { ...valid, url: "https://bad.example" },
  ])("rejects malformed output %j", (raw) =>
    expect(() => validateAnswer(raw, retrieve(question))).toThrow(
      "invalid_answer",
    ),
  );
  it("permits honest abstention without citations", () =>
    expect(
      validateAnswer(
        {
          answer: "The evidence cannot answer that.",
          evidenceIds: [],
          insufficientEvidence: true,
        },
        retrieve(question),
      ).insufficientEvidence,
    ).toBe(true));
  it("handles timeout and aborts upstream", async () => {
    let signal: AbortSignal | undefined;
    await expect(
      answerQuestion(
        question,
        async (input) => {
          signal = input.signal;
          return new Promise(() => {});
        },
        { timeoutMs: 5 },
      ),
    ).rejects.toMatchObject({ code: "timeout", status: 504 });
    expect(signal?.aborted).toBe(true);
  });
  it("sanitises upstream errors", async () => {
    await expect(
      answerQuestion(question, async () => {
        throw new Error("private provider details");
      }),
    ).rejects.toMatchObject({ message: "upstream", status: 502 });
  });
  it("records metadata without question text", async () => {
    const log = vi.fn();
    await answerQuestion(question, provider, {
      model: "test",
      onMetadata: log,
    });
    expect(log).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toContain(question.question);
  });
  it("does not call a model for invalid input", async () => {
    const model = vi.fn(provider);
    await expect(answerQuestion({}, model)).rejects.toMatchObject({
      code: "invalid_request",
    });
    expect(model).not.toHaveBeenCalled();
  });
});
describe("availability and HTTP", () => {
  it("requires key", () =>
    expect(() => openAIProvider(undefined, "test")).toThrow("unavailable"));
  it("disables production, Vercel and missing keys", () => {
    for (const env of [
      { NODE_ENV: "production", AI_ENABLED: "true", OPENAI_API_KEY: "test" },
      { NODE_ENV: "development", AI_ENABLED: "true" },
      {
        NODE_ENV: "development",
        AI_ENABLED: "true",
        OPENAI_API_KEY: "test",
        VERCEL: "1",
      },
    ])
      expect(aiAvailable(env as NodeJS.ProcessEnv)).toBe(false);
  });
  it("allows explicitly enabled local development", () =>
    expect(
      aiAvailable({
        NODE_ENV: "development",
        AI_ENABLED: "true",
        OPENAI_API_KEY: "test",
      }),
    ).toBe(true));
  it("returns safe missing-key status", async () => {
    const response = await POST(
      new Request("http://localhost/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(question),
      }),
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("OPENAI_API_KEY");
  });
  it("bounds streamed bodies without content-length", async () => {
    await expect(
      readBody(
        new Request("http://localhost", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "x".repeat(4097),
        }),
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("rejects malformed JSON", async () => {
    await expect(
      readBody(
        new Request("http://localhost", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{",
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("rejects cross-origin POST", async () => {
    const response = await POST(
      new Request("http://localhost/api/ask", {
        method: "POST",
        headers: {
          origin: "http://evil.example",
          "content-type": "application/json",
        },
        body: JSON.stringify(question),
      }),
    );
    expect(response.status).toBe(403);
  });
});
it("times out a stalled incoming body before calling the model", async () => {
  const request = new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: new ReadableStream({ start() {} }),
    duplex: "half",
  } as RequestInit);
  await expect(readBody(request, 5)).rejects.toMatchObject({ status: 408 });
});
