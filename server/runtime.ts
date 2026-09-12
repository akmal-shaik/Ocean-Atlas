import "server-only";
import { aiAvailable } from "./config";
import { openAIProvider } from "./openai";
import { answerQuestion, PipelineError } from "./pipeline";
export async function liveAnswer(raw: unknown) {
  if (!aiAvailable()) throw new PipelineError("unavailable", 503);
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  return answerQuestion(
    raw,
    openAIProvider(process.env.OPENAI_API_KEY, model),
    {
      model,
      onMetadata: (meta) => console.info("ocean_qa", JSON.stringify(meta)),
    },
  );
}
