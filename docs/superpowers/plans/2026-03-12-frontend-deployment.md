# Frontend Deployment — Cloudflare Pages Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the EduHub React/Vite SPA to Cloudflare Pages at `eduhub-dev.benelabs.tech`, connecting to the staging API.

**Architecture:** Static SPA built with Vite, deployed to Cloudflare Pages via `wrangler` CLI. A `_redirects` file handles SPA routing (already present). Environment variables are managed via Vite's `--mode` flag with a `.env.staging` file.

**Tech Stack:** Vite 5, React 18, TypeScript, Cloudflare Pages, Wrangler CLI, `public/_redirects`

---

## Chunk 1: Project Configuration

### Task 1: Verify SPA routing fallback

**Files:**
- Verify (existing): `public/_redirects`

`public/_redirects` already exists. Confirm it has the correct rule for Cloudflare Pages SPA routing.

- [ ] **Step 1: Inspect the existing `_redirects` file**

Run:
```bash
cat public/_redirects
```
Expected output (any line matching this pattern is sufficient):
```
/*    /index.html   200
```
The current file contains this rule — it is valid for Cloudflare Pages. The comment references Netlify, which is harmless; Cloudflare Pages honors the same format.

- [ ] **Step 2: Confirm no changes needed — do NOT commit**

The rule is correct. No edits required. Move to Task 2.

---

### Task 2: Add staging environment file

**Files:**
- Create: `.env.staging`
- Modify: `.gitignore` (add `.env.staging`)

Vite reads `.env.[mode]` when built with `--mode [mode]`. `.env.staging` is not covered by the current `.gitignore` (which only covers `*.local` variants).

- [ ] **Step 1: Append `.env.staging` to `.gitignore`**

Run:
```bash
echo ".env.staging" >> .gitignore
```

- [ ] **Step 2: Confirm `.env.staging` is now in `.gitignore`**

Run:
```bash
grep "\.env\.staging" .gitignore
```
Expected:
```
.env.staging
```

- [ ] **Step 3: Create `.env.staging`**

Create the file with this content:
```
VITE_EDUHUB_API_BASE_URL=https://eduhub-platform-api-staging.kubeletto.app
```

- [ ] **Step 4: Build with staging mode to confirm env var is picked up**

Run:
```bash
npx vite build --mode staging
```
Expected output (last lines):
```
✓ built in X.XXs
dist/index.html   X kB
dist/assets/...   X kB
```

- [ ] **Step 5: Confirm API URL is baked into the build**

Run:
```bash
grep -r "eduhub-platform-api-staging" dist/assets/*.js | head -3
```
Expected: at least one match showing the staging API URL is present in the bundle.

- [ ] **Step 6: Commit `.gitignore` only (not `.env.staging`)**

```bash
git add .gitignore
git commit -m "chore: ignore .env.staging from version control"
```

---

### Task 3: Install wrangler as dev dependency and add configuration

**Files:**
- Modify: `package.json` (devDependencies — wrangler)
- Modify: `package-lock.json` (updated by npm)
- Create: `wrangler.toml`

`wrangler` should be pinned as a devDependency for reproducible deploys across environments.

> **Note:** The user has already authenticated via `wrangler login`. If running on a fresh machine, run `wrangler login` before Step 3.

- [ ] **Step 1: Install wrangler as a dev dependency**

Run:
```bash
npm install --save-dev wrangler
```
Expected: `package.json` devDependencies gains a `wrangler` entry.

- [ ] **Step 2: Verify wrangler is authenticated**

Run:
```bash
npx wrangler whoami
```
Expected:
```
You are logged in with an OAuth Token, associated with the email <your-email>@...
```
If you see an auth error, run `npx wrangler login` and complete the browser flow before continuing.

- [ ] **Step 3: Create `wrangler.toml`**

```toml
name = "eduhub-dev"
pages_build_output_dir = "dist"
```

- [ ] **Step 4: Verify wrangler CLI works against Cloudflare API**

Run:
```bash
npx wrangler pages project list
```
Expected: exits 0 and lists Cloudflare Pages projects (list may be empty if none exist yet — that is fine). Any auth error means Step 2 was not completed.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json wrangler.toml
git commit -m "chore: add wrangler dev dependency and Cloudflare Pages config"
```

---

### Task 4: Add deploy script and remove vercel.json

**Files:**
- Modify: `package.json` (scripts section)
- Delete: `vercel.json` (tracked file — use `git rm`)

Adds a single `npm run deploy:staging` command. Removes the now-unused Vercel config.

- [ ] **Step 1: Add deploy script to `package.json`**

Open `package.json` and add to the `"scripts"` object:

```json
"deploy:staging": "tsc -b && vite build --mode staging && npx wrangler pages deploy dist --project-name eduhub-dev"
```

Full scripts section should look like:
```json
"scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "deploy:staging": "tsc -b && vite build --mode staging && npx wrangler pages deploy dist --project-name eduhub-dev"
},
```

- [ ] **Step 2: Remove `vercel.json` using git rm**

```bash
git rm vercel.json
```
Expected:
```
rm 'vercel.json'
```

- [ ] **Step 3: Verify both changes are staged**

Run:
```bash
git status
```
Expected: `package.json` shows as modified, `vercel.json` shows as deleted — both staged.

- [ ] **Step 4: Verify no Vercel references remain in config files**

Run:
```bash
grep -r "vercel" . --include="*.json" --include="*.ts" --include="*.tsx" -l | grep -v node_modules | grep -v package-lock.json
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "chore: add Cloudflare Pages deploy script, remove vercel.json"
```

---

## Chunk 2: Deploy and DNS

### Task 5: First deploy to Cloudflare Pages

**Files:** none — CLI only

This creates the Pages project on Cloudflare and uploads the built files for the first time.

- [ ] **Step 1: Verify `_redirects` is in the build output**

Run:
```bash
ls dist/_redirects
```
Expected: file exists. If missing, confirm `public/_redirects` exists and re-run `npx vite build --mode staging` before continuing.

- [ ] **Step 2: Run the deploy**

Run:
```bash
npm run deploy:staging
```
Expected output (last lines):
```
✨ Deployment complete! Take a peek over at https://eduhub-dev.pages.dev
```

Copy the `*.pages.dev` URL.

- [ ] **Step 3: Verify the site loads at the pages.dev URL**

Open `https://eduhub-dev.pages.dev` in the browser.

Expected: EduHub login page loads, no blank screen, no console errors about missing chunks.

- [ ] **Step 4: Verify SPA routing works**

In the browser, navigate directly to a deep route by typing it in the URL bar (e.g. `https://eduhub-dev.pages.dev/dashboard`).

Expected: page loads correctly (not a 404 or Cloudflare error page).

- [ ] **Step 5: Verify API calls work**

Open browser DevTools → Network tab. Log in or trigger any API call.

Expected: requests go to `https://eduhub-platform-api-staging.kubeletto.app/...` and return non-network-error responses.

---

### Task 6: Configure custom domain in Cloudflare Pages

**Files:** none — Cloudflare dashboard only

Attaches `eduhub-dev.benelabs.tech` to the Pages project. Since `benelabs.tech` is already on Cloudflare, DNS is auto-configured.

- [ ] **Step 1: Open Cloudflare Pages project settings**

Go to: `https://dash.cloudflare.com` → Workers & Pages → `eduhub-dev` → Custom domains tab.

- [ ] **Step 2: Add custom domain**

Click "Set up a custom domain" → enter `eduhub-dev.benelabs.tech` → click Continue.

Cloudflare will show a DNS record to add:
```
Type:   CNAME
Name:   eduhub-dev
Target: eduhub-dev.pages.dev
```

- [ ] **Step 3: Activate the domain**

Since `benelabs.tech` is already managed by Cloudflare DNS, click "Activate domain". Cloudflare auto-adds the CNAME record.

Expected: status changes to "Active" within 1–5 minutes (certificate provisioning can take longer on first setup).

- [ ] **Step 4: Verify the custom domain loads**

Open `https://eduhub-dev.benelabs.tech` in the browser.

Expected: EduHub app loads. HTTPS certificate is auto-provisioned by Cloudflare.

- [ ] **Step 5: Final smoke test on custom domain**

- [ ] Login flow works end-to-end
- [ ] Navigate to a deep route directly in URL bar (e.g. `/dashboard`) → no 404
- [ ] API calls succeed (visible in browser DevTools → Network tab)

---

## Future Deploys

After initial setup, deploying updates is a single command:

```bash
npm run deploy:staging
```

No dashboard interaction needed.
