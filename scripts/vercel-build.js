#!/usr/bin/env node
/**
 * Wrapper for Vercel production build. Sanitizes VERCEL_TOKEN (and similar env vars)
 * so they contain no newlines - fixing "Must not contain: \\n" errors when the
 * token was pasted with an extra line in project settings.
 */
const { spawnSync } = require('child_process');

// #region agent log
(function () {
  const tokenKeys = ['VERCEL_TOKEN', 'VERCEL_ACCESS_TOKEN', 'TOKEN'];
  let hadNewline = false;
  for (const key of tokenKeys) {
    const v = process.env[key];
    if (v && typeof v === 'string' && /[\r\n]/.test(v)) hadNewline = true;
  }
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'vercel-build.js:entry', message: 'vercel-build.js started', data: { hasVercelToken: !!process.env.VERCEL_TOKEN, tokenHadNewline: hadNewline }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H1' }) }).catch(function () {});
})();
// #endregion

const tokenKeys = ['VERCEL_TOKEN', 'VERCEL_ACCESS_TOKEN', 'TOKEN'];
for (const key of tokenKeys) {
  if (process.env[key] && typeof process.env[key] === 'string') {
    process.env[key] = process.env[key].replace(/\r?\n/g, '').trim();
  }
}

const r = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});
process.exit(r.status !== null ? r.status : 1);
