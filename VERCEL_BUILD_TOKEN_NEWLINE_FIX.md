# Vercel production build: "Must not contain: \n" token error

## Error

```
Error: You defined "--token", but its contents are invalid. Must not contain: "\n"
Error: Command "vercel build" exited with 1
```

Build works in **Preview/Development** but fails in **Production**.

## Cause

The token used for the build (e.g. `VERCEL_TOKEN`) is read by Vercel’s build runner **before** your Build Command runs. If that value contains a newline (e.g. pasted with an extra line, or synced from a multiline secret), the CLI rejects it and the build fails. Production often uses a different env source, so the problem can appear only there.

## Fix (recommended)

1. Open **Vercel Dashboard** → your project → **Settings** → **Environment Variables**.
2. Find the variable used for the build token:
   - Often **Production** only, e.g. `VERCEL_TOKEN` or `VERCEL_ACCESS_TOKEN`.
   - Or a custom token variable referenced by the build.
3. **Edit** that variable (Production):
   - Re-paste the token as a **single line** (no trailing Enter, no extra lines).
   - Or retype it.
   - Save.
4. **Redeploy** (e.g. push a commit or “Redeploy” on the last deployment).

The value must not contain `\n` or `\r`. Trimming in code cannot fix this, because validation happens before your Build Command runs.

## What we do in code

`scripts/vercel-build.js` (used as Build Command in `vercel.json`) sanitizes `VERCEL_TOKEN`, `VERCEL_ACCESS_TOKEN`, and `TOKEN` so that **child processes** (e.g. `npm run build`) see a trimmed value. That only helps if the build runner actually runs this script; if the error appears, the token was already rejected earlier, so fix the variable in the dashboard as above.
