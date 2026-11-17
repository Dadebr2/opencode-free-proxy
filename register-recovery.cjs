#!/usr/bin/env node
// Registra a recuperacao automatica do OC-Free (tarefa agendada, sem janela). Idempotente.
// Uso: node register-recovery.cjs [diretorio-do-proxy]
"use strict";
const fs = require("node:fs"), path = require("node:path"), os = require("node:os"), cp = require("node:child_process");
const dir = path.resolve(process.argv[2] || __dirname || path.join(os.homedir(), "opencode-free-proxy"));
for (const f of ["watchdog.cjs", "server.mjs"]) if (!fs.existsSync(path.join(dir, f))) { console.error(f + " nao encontrado em " + dir); process.exit(1); }
const setup = path.join(__dirname, "register-recovery.ps1");
const r = cp.spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-File", setup, "-ProxyDir", dir, "-NodePath", process.execPath], { stdio: "inherit", windowsHide: true, timeout: 120000 });
if (r.error) { console.error(r.error.message); process.exit(1); }
process.exit(r.status || 0);
