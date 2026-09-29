// One-time backend setup with uv (no Docker):  bun run setup:api
import { spawnSync } from "node:child_process"
import { join } from "node:path"

const win = process.platform === "win32"
const py = join("backend", ".venv", win ? "Scripts/python.exe" : "bin/python")
const sh = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: win })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

sh("uv", ["venv", join("backend", ".venv"), "--python", "3.12"])
sh("uv", ["pip", "install", "--python", py, "-r", join("backend", "requirements.txt")])
console.log("\n  Done. Put your key in .env (GROQ_API_KEY=...) and run:  bun run dev:all\n")
