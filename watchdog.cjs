const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const net = require('node:net');
const readline = require('node:readline');

const PORT = 6446;
const LOCK_PORT = 6445;
const TICK_MS = 10000;
const BIND_GRACE_MS = 150000;
const STARTUP_GRACE_MS = 360000;
const serverFile = path.join(__dirname, 'server.mjs');
const pidFile = path.join(__dirname, 'server.pid');
const log = (message) => fs.appendFileSync(
  path.join(__dirname, 'watchdog.log'),
  new Date().toISOString() + ' ' + message + '\n',
);

let managedChild = null;
let startedAt = 0;
let ready = false;
let failures = 0;
let busy = false;

function recordOutput(stream, filename) {
  const lines = readline.createInterface({ input: stream });
  lines.on('line', (line) => {
    const safeLine = line.replace(/\b(?:oc-|sk-)[a-z0-9_-]{12,}\b/gi, '[redigido]');
    fs.appendFileSync(path.join(__dirname, filename), safeLine + '\n');
  });
}

function startProxy() {
  const child = cp.spawn(process.execPath, [serverFile], {
    cwd: __dirname,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PROXY_PORT: String(PORT), NODE_USE_SYSTEM_CA: '1' },
  });
  managedChild = child;
  startedAt = Date.now();
  ready = false;
  failures = 0;
  recordOutput(child.stdout, 'opencode-free-proxy.log');
  recordOutput(child.stderr, 'opencode-free-proxy-error.log');

  child.once('spawn', () => {
    fs.writeFileSync(pidFile, JSON.stringify({ pid: child.pid, started: startedAt }));
    log('Proxy em inicializacao (PID ' + child.pid + ').');
  });
  child.once('error', (error) => log('Falha ao iniciar proxy: ' + error.message));
  child.once('close', (code, signal) => {
    if (managedChild === child) managedChild = null;
    log('Proxy encerrou (PID ' + child.pid + ', codigo ' + code + ', sinal ' + signal + ').');
  });
}

async function queryHealth() {
  try {
    const response = await fetch('http://127.0.0.1:' + PORT + '/health', {
      signal: AbortSignal.timeout(3500),
    });
    const data = await response.json();
    return { ok: response.ok && data.status === 'ok' && data.models > 0, status: response.status, models: data.models };
  } catch (error) {
    return { ok: false, error: error.cause?.code || error.name };
  }
}

function portAvailable() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', (error) => {
      if (error.code === 'EADDRINUSE') resolve(false);
      else reject(error);
    });
    probe.listen(PORT, '0.0.0.0', () => probe.close(() => resolve(true)));
  });
}

function previousProxyPid() {
  let pid;
  try { pid = JSON.parse(fs.readFileSync(pidFile, 'utf8')).pid; } catch { return null; }
  if (!Number.isSafeInteger(pid) || pid <= 0) return null;
  const script = [
    '$p = Get-CimInstance Win32_Process -Filter "ProcessId=' + pid + '"',
    'if ($p.Name -eq "node.exe" -and $p.CommandLine.TrimEnd().TrimEnd([char]34).EndsWith($env:OCFREE_SERVER_FILE, [StringComparison]::OrdinalIgnoreCase)) { Write-Output $p.ProcessId }',
  ].join('; ');
  const result = cp.spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8', windowsHide: true, timeout: 8000,
    env: { ...process.env, OCFREE_SERVER_FILE: serverFile },
  });
  return result.stdout?.trim() === String(pid) ? pid : null;
}

function stopProxy(pid) {
  const result = cp.spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
    windowsHide: true, stdio: 'ignore', timeout: 8000,
  });
  if (result.status !== 0) log('O encerramento do PID ' + pid + ' retornou ' + (result.error?.code || result.status) + '.');
}

async function tick() {
  if (busy) return;
  busy = true;
  try {
    const health = await queryHealth();
    if (health.ok) {
      if (!ready) log('Proxy pronto, ' + health.models + ' modelos.');
      ready = true;
      failures = 0;
      return;
    }

    if (managedChild && !ready) {
      const grace = health.status === 503 ? STARTUP_GRACE_MS : BIND_GRACE_MS;
      if (Date.now() - startedAt < grace) return;
    }

    failures++;
    if (ready && failures < 3) return;

    if (managedChild?.pid || !(await portAvailable())) {
      const pid = managedChild?.pid || previousProxyPid();
      if (pid) {
        log('Reiniciando proxy (PID ' + pid + ', ' + (health.status || health.error) + ').');
        stopProxy(pid);
      } else if (failures <= 3) {
        log('Porta ' + PORT + ' ocupada por processo sem vinculo confirmado com o OCFree.');
      }
      return;
    }

    startProxy();
  } catch (error) {
    log('Falha no watchdog: ' + error.message);
  } finally {
    busy = false;
  }
}

const lock = net.createServer();
lock.once('error', (error) => {
  if (error.code !== 'EADDRINUSE') {
    log('Falha ao iniciar monitor: ' + error.message);
    process.exitCode = 1;
  }
});
lock.listen(LOCK_PORT, '127.0.0.1', () => {
  log('Monitor continuo iniciado (v1.2.1).');
  void tick();
  setInterval(tick, TICK_MS);
});
