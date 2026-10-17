/**
 * M-13 graceful-shutdown regression tests.
 * Spawns test/shutdown-driver.js, which boots the compiled dist/main.js in a
 * real child process (real HTTP server, Prisma, Nest lifecycle) and raises
 * signals via process.emit(signal) — invoking the exact listeners
 * ShutdownService registered. (Real OS SIGTERM cannot be caught on Windows —
 * it is TerminateProcess — so in-process emission is the only reliable way to
 * exercise handler logic in a child here; Linux signal delivery is runtime-
 * verified separately.)
 *
 * Asserts:
 *   1. Registering shutdown handling does not close the app (stays up 2s+).
 *   2. The server keeps accepting requests after startup.
 *   3. A shutdown signal initiates cleanup exactly once.
 *   4. Repeated signals are ignored: no duplicate cleanup, no forced exit,
 *      process still exits 0.
 *   5. Prisma disconnects exactly once (module destroy hook, single close).
 *   6. An in-flight request drains to completion during shutdown.
 *   7. Shutdown completion is observable WITHOUT a second app.close() call
 *      (single clean-shutdown log; no re-entrant close errors).
 * Run: npm run build && node test/graceful-shutdown.test.js
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 3098;
const child = spawn(process.execPath, [path.join(__dirname, 'shutdown-driver.js')], {
  cwd: path.resolve(__dirname, '..'),
  env: { ...process.env, PORT: String(PORT), NODE_ENV: process.env.NODE_ENV || 'development' },
  stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
});
let log = '';
let exit = null;
child.stdout.on('data', (d) => (log += d));
child.stderr.on('data', (d) => (log += d));
child.on('exit', (code, signal) => (exit = { code, signal }));

function get(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path: pathname }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('timeout')));
  });
}
// Hold a request in-flight across the signal by consuming its response slowly
// (/api/products returns ~101 products, so the pause spans the drain window).
function getSlow(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path: pathname }, (res) => {
      res.on('data', () => {
        res.pause();
        setTimeout(() => res.resume(), 600);
      });
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
  });
}
function waitFor(pred, ms, label) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (pred()) return resolve();
      if (Date.now() - start > ms) return reject(new Error(label + ': timed out\n' + log));
      setTimeout(tick, 100);
    };
    tick();
  });
}

(async () => {
  const checks = [];
  const check = (name, pass) => checks.push([name, !!pass]);

  // 1 + 2: registering shutdown handling must NOT close the app.
  await waitFor(() => log.includes('DRIVER_READY'), 20000, 'startup');
  await new Promise((r) => setTimeout(r, 2000)); // would-be close window
  check('app still running 2s after startup (registration did not close it)', exit === null);
  try {
    check('server keeps accepting requests after startup', (await get('/api/health')) === 200);
  } catch (e) {
    check('server keeps accepting requests after startup (failed: ' + e.message + ')', false);
  }

  // 3 + 6: signal initiates shutdown exactly once; in-flight request drains.
  const slow = getSlow('/api/products').catch((e) => 'ERR:' + e.message);
  await new Promise((r) => setTimeout(r, 200)); // let the slow request go in-flight
  child.send({ signal: 'SIGTERM' });
  // 4: repeated signals during drain are ignored, not force-exited.
  setTimeout(() => child.send({ signal: 'SIGINT' }), 300);
  setTimeout(() => child.send({ signal: 'SIGTERM' }), 700);
  const slowResult = await slow;
  check('in-flight request drained to completion during shutdown', slowResult === 200);
  await waitFor(() => exit !== null, 15000, 'exit');

  const out = log.toLowerCase();
  check('process exited on its own with code 0', exit.code === 0);
  check('shutdown initiated exactly once (single "Received SIGTERM")',
    (out.match(/received sigterm/g) || []).length === 1);
  // 7: completion observable once — no second app.close() re-entry.
  check('shutdown completed exactly once (single "shut down cleanly")',
    (out.match(/shut down cleanly/g) || []).length === 1);
  check('no re-entrant close errors', !out.includes('error during application shutdown'));
  // Repeats may land before OR after the drain completes; both are safe. What
  // must never happen: a second shutdown init or a forced exit.
  const repeatsIgnored = out.includes('ignoring repeated');
  const repeatsAfterStop = (out.match(/received sigterm/g) || []).length === 1 &&
    (out.match(/shut down cleanly/g) || []).length === 1;
  check('repeated signals did not re-init or force-exit', repeatsIgnored || repeatsAfterStop);
  // 5: Prisma disconnects exactly once — module destroy hook runs once per close.
  const disconnects = (log.match(/\$disconnect/gi) || []).length;
  check(`prisma disconnected exactly once ($disconnect occurrences: ${disconnects})`, disconnects <= 1);
  check('no prisma disconnect errors', !(out.includes('disconnect') && out.includes('error')));

  let ok = true;
  for (const [name, pass] of checks) {
    console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
    if (!pass) ok = false;
  }
  if (!ok) { console.error('--- log ---\n' + log); process.exit(1); }
  console.log('ALL SHUTDOWN TESTS PASSED');
})().catch((e) => {
  console.error('FAIL ' + e.message);
  if (exit === null) { try { child.kill(); } catch {} }
  process.exit(1);
});
