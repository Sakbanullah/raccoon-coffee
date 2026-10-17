/**
 * Test-only driver for graceful-shutdown.test.js.
 * Boots the compiled dist/main.js IN THIS PROCESS (real HTTP server, real
 * Prisma, real Nest lifecycle), then raises the requested signals via
 * `process.emit(signal)` — which invokes the exact listeners ShutdownService
 * registered, identical to receiving a real signal.
 *
 * Why not a real OS signal? On Windows, SIGTERM/SIGINT delivered to a spawned
 * child (even self-raised via process.kill) is implemented as TerminateProcess
 * and is NOT catchable, so no JS handler can ever run. `process.emit` exercises
 * everything our code owns (handler -> exactly-once guard -> drain -> exit);
 * real cross-process signal delivery on Linux/VPS remains runtime-verified
 * separately (see temporary/backend-audit.md M-13).
 *
 * Protocol (IPC): parent sends { signal: "SIGTERM" } to raise a signal.
 */
const http = require('http');

process.on('message', (msg) => {
  if (msg && typeof msg.signal === 'string') {
    if (!signalReceived) {
      signalReceived = true;
      // Once shutdown starts, watch for the HTTP server to stop accepting,
      // then drop the IPC channel — it would otherwise keep this process
      // alive after a completed shutdown (a parent-child artifact, not an
      // app behavior; on Linux a real process has no such channel).
      watchForServerClose();
    }
    process.emit(msg.signal);
  }
});
let signalReceived = false;

function watchForServerClose() {
  const started = Date.now();
  (function poll() {
    const req = http.get({ host: '127.0.0.1', port, path: '/api/health' }, (res) => {
      res.resume();
      setTimeout(poll, 100);
    });
    req.on('error', () => process.disconnect());
    req.setTimeout(500, () => req.destroy());
    req.on('timeout', () => {
      if (Date.now() - started < 15000) setTimeout(poll, 100);
      else process.disconnect();
    });
  })();
}

require('../dist/main.js');

// Signal the parent (via a log line) once the server is ready; the parent
// watches stdout, so just poll our own health endpoint and print.
const port = Number(process.env.PORT) || 3001;
const started = Date.now();
(function poll() {
  const req = http.get({ host: '127.0.0.1', port, path: '/api/health' }, (res) => {
    res.resume();
    if (res.statusCode === 200) console.log('DRIVER_READY');
    else retry();
  });
  req.on('error', retry);
  function retry() {
    if (Date.now() - started < 15000) setTimeout(poll, 100);
    else { console.error('DRIVER_STARTUP_FAILED'); process.exit(1); }
  }
})();
