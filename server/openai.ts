import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { answerSchema } from "../lib/contracts";
import { PipelineError, type Provider } from "./pipeline";
// Only imported by the server-only runtime and the explicit CLI evaluation runner.
export function openAIProvider(
  apiKey: string | undefined,
  model: string,
): Provider {
  if (!apiKey) throw new PipelineError("unavailable", 503);
  const client = new OpenAI({ apiKey, maxRetries: 0, timeout: 20000 });
  return async ({ question, evidence, system, signal }) => {
    const response = await client.responses.parse(
      {
        model,
        store: false,
        max_output_tokens: 1000,
        input: [
          { role: "system", content: system },
          {
            role: "system",
            content: JSON.stringify({
              speciesScope: question.speciesIds,
              evidence,
            }),
          },
          { role: "user", content: question.question },
        ],
        text: { format: zodTextFormat(answerSchema, "ocean_answer") },
      },
      { signal },
    );
    if (response.status !== "completed")
      throw new PipelineError("invalid_answer", 502);
    return { output: response.output_parsed, usage: response.usage };
  };
}
