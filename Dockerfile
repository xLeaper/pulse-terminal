# Multi-stage build for Hugging Face Spaces (Docker SDK).
# HF requires the server listen on port 7860.

# ---------- 1. deps ----------
FROM node:22-alpine AS deps
# Next.js 16 + Turbopack needs glibc compatibility on Alpine, otherwise
# next/swc fails to load with "Error: Cannot find module ... swc".
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---------- 2. builder ----------
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# HF's free-tier build container can OOM during `next build`. Give Node room.
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PRIVATE_STANDALONE=true

# Rebuild the data snapshot from the bundled CSVs, then build Next.
RUN node scripts/build-snapshot.mjs && npm run build

# ---------- 3. runner ----------
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=7860
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# node:22-alpine already ships with user `node` at UID 1000 / GID 1000.
# HF requires the runtime to be a non-root user — reuse the built-in one.

# Standalone output is a self-contained server bundle.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 7860

CMD ["node", "server.js"]
