export async function POST() {
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404 });
  await new Promise((resolve) => setTimeout(resolve, 2500));
  return Response.json(
    { error: "Mock upstream failure — development fixture only." },
    { status: 502 },
  );
}
