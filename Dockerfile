FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma:generate
RUN pnpm build

FROM base AS runner
RUN apk add --no-cache tini
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./
COPY --chown=node:node --from=builder /app/prisma ./prisma

USER node
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]