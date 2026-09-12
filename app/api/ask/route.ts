import { liveAnswer } from "../../../server/runtime";
import { PipelineError } from "../../../server/pipeline";
export const runtime = "nodejs";
export const maxDuration = 30;
export const MAX_BODY_BYTES = 4096;
export async function readBody(request: Request, timeoutMs = 5000) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new PipelineError("invalid_request", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new PipelineError("invalid_request", 400);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new PipelineError("invalid_request", 408));
      void reader.cancel();
    }, timeoutMs);
  });
  const consume = (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BODY_BYTES) {
          await reader.cancel();
          throw new PipelineError("invalid_request", 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  })();
  try {
    await Promise.race([consume, timeout]);
  } finally {
    clearTimeout(timer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new PipelineError("invalid_request", 400);
  }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      return Response.json(
        { error: "Request origin not allowed." },
        { status: 403 },
      );
    return Response.json(await liveAnswer(await readBody(request)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const known = error instanceof PipelineError;
    const code = known ? error.code : "upstream";
    const messages = {
      unavailable: "AI guide is unavailable. Explore the source notes below.",
      invalid_request:
        "Choose one or two species and enter a question of 1–800 characters.",
      invalid_answer:
        "The guide returned an answer that could not be verified. Please try another question.",
      timeout: "The guide took too long. Please try again.",
      upstream: "The guide could not respond. Please try again later.",
    };
    return Response.json(
      { error: messages[code] },
      {
        status: known ? error.status : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
