# Apex Home Fitness — self-hosted deployment image (Next.js standalone).
# Usage: `docker compose up --build` (see docs/RELEASING.md §Deployment).

# --- Stage 1: dependencies ------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# CI=true keeps installs reproducible (no dev-only postinstall surprises).
RUN npm ci

# --- Stage 2: build --------------------------------------------------------
# Keeps the full dev toolchain (prisma CLI, typescript, playwright-free) so
# migrations can be run from this stage (used by the `migrate` compose
# service). Runtime dependencies are traced by Next standalone output.
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
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

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
