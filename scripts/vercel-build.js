#!/usr/bin/env node
/**
 * Wrapper for Vercel production build. Sanitizes VERCEL_TOKEN (and similar env vars)
 * so they contain no newlines - fixing "Must not contain: \\n" errors when the
 * token was pasted with an extra line in project settings.
 */
const { spawnSync } = require('child_process');

// Skip agent/debug network calls on Vercel so build never hangs waiting for localhost
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
