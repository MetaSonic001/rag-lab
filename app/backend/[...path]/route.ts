/**
 * Thin server-side proxy to the FastAPI backend.
 * The browser only ever talks to /backend/*; the Python service (and the Groq key it holds)
 * stays private on the server. A route handler (not a rewrite) so long LLM calls are not cut off.
 */
export const maxDuration = 60 // Vercel: allow slow LLM calls (seconds)

const BACKEND = (process.env.BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "")
const SECRET = process.env.API_SHARED_SECRET ?? ""

async function forward(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const url = `${BACKEND}/${path.join("/")}${new URL(request.url).search}`
  const hasBody = !["GET", "HEAD"].includes(request.method)
  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/json",
        ...(SECRET ? { "x-api-secret": SECRET } : {}),
      },
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
    })
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    })
  } catch {
    return Response.json(
      { detail: "The RAG LAB backend is not running. Start it with `bun run api` (see README)." },
      { status: 502 }
    )
  }
}

export { forward as GET, forward as POST }
