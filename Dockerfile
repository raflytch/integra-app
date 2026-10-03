# syntax=docker/dockerfile:1.7
# One Dockerfile for the monorepo. Build from the repository root with a target:
#   docker build --target api .      NestJS API runtime
#   docker build --target web .      Next.js standalone runtime
#   docker build --target migrate .  Prisma migrations and seed scripts

ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Prisma's schema engine needs OpenSSL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Workspace manifests only, so dependency layers stay cached across code changes.
FROM base AS manifests
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

FROM manifests AS deps
RUN --mount=type=cache,target=/root/.npm npm ci

FROM manifests AS api-prod-deps
RUN --mount=type=cache,target=/root/.npm \
  npm ci --omit=dev --workspace=@app/api --include-workspace-root=false

# ---------- API ----------
FROM deps AS api-build
COPY apps/api apps/api
RUN npm run prisma:generate && npm run build --workspace=@app/api

FROM api-build AS migrate
WORKDIR /app/apps/api
CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS api
ENV NODE_ENV=production
COPY --from=api-prod-deps --chown=node:node /app ./
COPY --from=api-build --chown=node:node /app/apps/api/dist ./apps/api/dist
WORKDIR /app/apps/api
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]

# ---------- Web ----------
FROM deps AS web-build
# Inlined into the client bundle at build time; relative so one image serves any domain.
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY apps/web apps/web
RUN npm run build --workspace=@app/web

FROM ${NODE_IMAGE} AS web
WORKDIR /app
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  HOSTNAME=0.0.0.0 \
  PORT=3000
COPY --from=web-build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=web-build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=web-build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
