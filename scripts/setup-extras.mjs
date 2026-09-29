// Optional heavier tools (Docling, Crawl4AI, RAGAS, DeepEval):  bun run setup:extras
// Crawl4AI additionally needs a one-time browser download:  backend/.venv/Scripts/crawl4ai-setup
import { spawnSync } from "node:child_process"
import { join } from "node:path"

const win = process.platform === "win32"
const py = join("backend", ".venv", win ? "Scripts/python.exe" : "bin/python")
const r = spawnSync("uv", ["pip", "install", "--python", py, "-r", join("backend", "requirements-extra.txt")], { stdio: "inherit", shell: win })
console.log("\n  Optional next step for the Crawl4AI loader (downloads a browser, ~150 MB):\n    " + join("backend", ".venv", win ? "Scripts" : "bin", "crawl4ai-setup") + "\n")
process.exit(r.status ?? 0)
