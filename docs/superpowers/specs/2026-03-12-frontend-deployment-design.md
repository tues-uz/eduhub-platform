# Frontend Deployment Design — EduHub Platform

**Date**: 2026-03-12
**Status**: Approved
**Environment**: Staging only

## Summary

Deploy the EduHub frontend (React 18 + Vite SPA) to **Cloudflare Pages** under `eduhub-dev.benelabs.tech`, connecting to the existing staging API at `eduhub-platform-api-staging.kubeletto.app`.

## Architecture

```
Developer machine
  └─ npm run deploy:staging
        ├─ tsc -b && vite build   (reads .env.staging)
        └─ wrangler pages deploy dist --project-name eduhub-dev

Cloudflare Pages (CDN edge, global)
  └─ eduhub-dev.benelabs.tech
        └─ SPA (index.html for all routes via _redirects)
              └─ VITE_EDUHUB_API_BASE_URL
                    └─ eduhub-platform-api-staging.kubeletto.app
```

## Components

### 1. `public/_redirects`
Cloudflare Pages SPA routing fallback:
```
/* /index.html 200
```

### 2. `.env.staging`
Build-time environment variables for staging:
```
VITE_EDUHUB_API_BASE_URL=https://eduhub-platform-api-staging.kubeletto.app
```

### 3. `wrangler.toml`
Cloudflare Pages project configuration:
```toml
name = "eduhub-dev"
pages_build_output_dir = "dist"
```

### 4. `package.json` deploy script
```json
"deploy:staging": "tsc -b && vite build --mode staging && wrangler pages deploy dist --project-name eduhub-dev"
```

### 5. Remove `vercel.json`
No longer needed — replaced by Cloudflare Pages config.

## Domain

- **Dev URL**: `eduhub-dev.benelabs.tech`
- **Cloudflare Pages default**: `eduhub-dev.pages.dev`
- DNS: CNAME `eduhub-dev` → `eduhub-dev.pages.dev` (configured in Cloudflare dashboard)

## Prerequisites

- [x] `wrangler` CLI installed and authenticated (`wrangler login`)
- [ ] Cloudflare Pages project created (auto-created on first deploy)
- [ ] DNS CNAME record added for `eduhub-dev.benelabs.tech`
- [ ] Custom domain configured in Cloudflare Pages dashboard

## Deploy Command

```bash
npm run deploy:staging
```

## Environment Variables

| Variable | Value |
|---|---|
| `VITE_EDUHUB_API_BASE_URL` | `https://eduhub-platform-api-staging.kubeletto.app` |
