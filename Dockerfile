# Apex Home Fitness — self-hosted deployment image (Next.js standalone).
# Usage: `docker compose up --build` (see docs/RELEASING.md §Deployment).

# --- Stage 1: dependencies ------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmjs.org/
COPY package.json package-lock.json ./
# Keep installs reproducible while allowing restricted-network deployments to
# select a reachable npm proxy. The lockfile's npmjs tarball hosts are
# rewritten by npm so the mirror is used for the actual downloads too.
RUN npm ci \
  --registry="${NPM_REGISTRY}" \
  --replace-registry-host=always \
  --fetch-timeout=30000 \
  --fetch-retries=2 \
  --fetch-retry-mintimeout=1000 \
  --fetch-retry-maxtimeout=5000

# --- Stage 2: build --------------------------------------------------------
# Keeps the full dev toolchain (prisma CLI, typescript, playwright-free) so
# migrations can be run from this stage (used by the `migrate` compose
# service). Runtime dependencies are traced by Next standalone output.
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are INLINED into the client bundle at build time —
# pass them in as build args (from the compose .env) or the browser bundle
# would ship with undefined Supabase/site values. Never put secrets here.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
# A placeholder DATABASE_URL satisfies prisma client generation at build time;
# the real DB path is injected at runtime via the compose environment.
ENV DATABASE_URL="file:./build.db"
# Fonts are self-hosted (src/app/fonts/) so the build never fetches
# fonts.googleapis.com — required for restricted-network servers.
RUN npm run build

# --- Stage 3: runner -------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Standalone server + static assets + Prisma runtime.
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
# Prisma client engines are not traced by the standalone bundler — ship them.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
# DB volume writability preflight — fails fast at boot when the SQLite volume
# is not writable by the nextjs user (AUTH-FIX-01: a root-owned volume silently
# made every DB write fail while HTTP smoke stayed green).
COPY --from=build /app/scripts/preflight-db.mjs ./scripts/preflight-db.mjs

# Ensure the database directory is writable by the nextjs user.
USER root
# Next may write its incremental image/data cache at runtime. The standalone
# bundle is copied as root, so create and grant the cache path before dropping
# privileges; otherwise the first image request produces EACCES noise/errors.
RUN mkdir -p /data /app/.next/cache && chown -R nextjs:nodejs /data /app/.next
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Preflight before serving: verifies the SQLite volume is writable, then execs
# the real server so node stays PID 1 (signal handling preserved).
CMD ["sh", "-c", "node scripts/preflight-db.mjs && exec node server.js"]
