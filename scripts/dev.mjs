// Starts the Python API and the Next.js dev server together:  bun run dev:all
// Both logs are shown with an [api] / [web] prefix, and we tell you when the API is actually ready.
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

const win = process.platform === "win32"
const py = resolve("backend", ".venv", win ? "Scripts/python.exe" : "bin/python") // absolute: the API runs with cwd=backend

if (!existsSync(py)) {
  console.error("\n  Backend not set up yet. Run:  bun run setup:api\n")
  process.exit(1)
}

const color = { api: "\x1b[36m", web: "\x1b[35m", lab: "\x1b[32m" }
const log = (name, text) => {
  for (const line of String(text).split(/\r?\n/)) if (line.trim()) console.log(`${color[name]}[${name}]\x1b[0m ${line}`)
}

const run = (name, cmd, args, opts = {}) => {
  const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PYTHONUNBUFFERED: "1", FORCE_COLOR: "0" }, ...opts })
  p.stdout.on("data", (d) => log(name, d))
  p.stderr.on("data", (d) => log(name, d))
  p.on("error", (e) => log(name, `failed to start: ${e.message}`))
  p.on("exit", (code) => {
    log(name, `exited with code ${code}`)
    process.exit(code ?? 0)
  })
  return p
}

log("lab", "Starting the Python API (first start loads the AI models: allow 30-60 s)…")
const api = run("api", py, ["-u", "-m", "uvicorn", "main:app", "--port", "8000"], { cwd: "backend" })
const web = run("web", win ? "bun.exe" : "bun", ["run", "dev"])

// Tell the user when the API is really up (it prints nothing until all lessons are imported).
const started = Date.now()
const poll = setInterval(async () => {
  try {
    const r = await fetch("http://127.0.0.1:8000/api/status")
    const s = await r.json()
    clearInterval(poll)
    const bad = Object.entries(s.lessons).filter(([, v]) => v !== "ok")
    log("lab", `✓ API ready after ${Math.round((Date.now() - started) / 1000)} s · Groq key: ${s.llm.configured ? "found" : "MISSING (add GROQ_API_KEY to .env)"} · model: ${s.llm.model}`)
    if (bad.length) log("lab", `⚠ lessons that failed to load: ${bad.map(([k, v]) => `${k} (${v})`).join(", ")}`)
    log("lab", "Open http://localhost:3000")
  } catch {
    if (Date.now() - started > 180000) { clearInterval(poll); log("lab", "✗ API did not respond within 3 minutes. Check the [api] lines above for errors.") }
  }
}, 2000)

for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { api.kill(); web.kill(); process.exit(0) })
