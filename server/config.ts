export function aiAvailable(env: NodeJS.ProcessEnv = process.env) {
  // Public/production paid calls stay OFF. A future deployment must add durable abuse controls.
  return (
    env.NODE_ENV === "development" &&
    env.AI_ENABLED === "true" &&
    !!env.OPENAI_API_KEY &&
    !env.VERCEL
  );
}
