const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const net = require('node:net');

const dir = __dirname;
const pidFile = path.join(dir, 'server.pid');
const PORT = 6446;
const LOCK_PORT = 6445;

const lockServer = net.createServer();
lockServer.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    process.exit(0);
  }
});
lockServer.listen(LOCK_PORT, '127.0.0.1');

const log = (m) => fs.appendFileSync(path.join(dir, 'watchdog.log'), new Date().toISOString() + ' ' + m + '\n');

function isPortBound(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', (err) => resolve(err.code === 'EADDRINUSE'));
    s.once('listening', () => s.close(() => resolve(false)));
    s.listen(port, '0.0.0.0');
  });
}

async function queryHealth() {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/health`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return { reachable: true, ok: false, status: r.status };
    const j = await r.json();
    return { reachable: true, ok: j.status === 'ok' && j.models > 0, status: r.status, models: j.models };
  } catch (e) {
    return { reachable: false, ok: false, error: e.message };
  }
}

function getPidListeningOnPort(port) {
  try {
    const out = cp.execFileSync('netstat.exe', ['-ano', '-p', 'tcp'], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
    for (const line of out.split('\n')) {
      if (line.includes(`:${port}`) && line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parseInt(parts[parts.length - 1], 10);
        if (pid && !isNaN(pid)) return pid;
      }
    }
  } catch {}
  return null;
}

function readPidFile() {
  try { return JSON.parse(fs.readFileSync(pidFile, 'utf8')); } catch { return null; }
}

function forceKill(pid) {
  if (!pid) return;
  try { process.kill(pid, 'SIGKILL'); } catch {}
  try { cp.execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, timeout: 20000 }); } catch {}
}

async function ensurePortFree(maxWaitMs = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxWaitMs) {
    const bound = await isPortBound(PORT);
    if (!bound) return true;
    const pid = getPidListeningOnPort(PORT);
    if (pid) {
      log(`Porta ${PORT} ocupada pelo processo ${pid}; finalizando...`);
      forceKill(pid);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return !(await isPortBound(PORT));
}

let lastStart = 0;
let consecutiveFailures = 0;

async function check() {
  const h = await queryHealth();
  if (h.ok) {
    consecutiveFailures = 0;
    return;
  }

  if (Date.now() - lastStart < 90000) return;

  consecutiveFailures++;
  if (consecutiveFailures < 2) return;

  log(`Servico indisponivel (${h.reachable ? 'HTTP ' + h.status : h.error}); reiniciando...`);

  const info = readPidFile();
  if (info && info.pid) forceKill(info.pid);

  const freed = await ensurePortFree(20000);
  if (!freed) {
    log(`ERRO CRITICO: porta ${PORT} continua ocupada; abortando reinicio.`);
    return;
  }

  try { fs.unlinkSync(pidFile); } catch {}

  const out = fs.openSync(path.join(dir, 'opencode-free-proxy.log'), 'a');
  const err = fs.openSync(path.join(dir, 'opencode-free-proxy-error.log'), 'a');
  cp.spawn(process.execPath, [path.join(dir, 'server.mjs')], {
    cwd: dir,
    detached: true,
    windowsHide: true,
    stdio: ['ignore', out, err],
    env: { ...process.env, PROXY_PORT: String(PORT), NODE_USE_SYSTEM_CA: '1' },
  }).unref();

  lastStart = Date.now();
  consecutiveFailures = 0;
  log('Recuperacao automatica: servico reiniciado com sucesso.');
}

let busy = false;
async function tick() {
  if (busy) return;
  busy = true;
  try { await check(); } catch (e) { log('Falha no watchdog: ' + e.message); } finally { busy = false; }
}

log('Monitor continuo iniciado (v1.1.0 definitivo).');
tick();
setInterval(tick, 30000);
