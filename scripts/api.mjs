// Starts only the Python API:  bun run api
import { spawn } from "node:child_process"
import { join } from "node:path"

const win = process.platform === "win32"
const py = join(".venv", win ? "Scripts/python.exe" : "bin/python")
spawn(py, ["-m", "uvicorn", "main:app", "--port", "8000"], { cwd: "backend", stdio: "inherit" })
