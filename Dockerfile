# syntax=docker/dockerfile:1
# Beer Golf — SvelteKit (adapter-node) + SQLite. Persistent data i volymen /data.

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# drizzle.config.ts kräver DATABASE_URL vid import — dummy under bygget
RUN DATABASE_URL=/tmp/build.db npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATABASE_URL=/data/beergolf.db \
    STORAGE_DRIVER=fs \
    UPLOAD_DIR=/data/uploads \
    BODY_SIZE_LIMIT=268435456

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/scripts ./scripts
# Seed-scriptet (första admin + teoriprov) importerar schemat
COPY --from=build /app/src/lib/server/db/schema.ts ./src/lib/server/db/schema.ts

RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]
EXPOSE 3000

# Migrera db, starta servern. ORIGIN (t.ex. https://beergolf.example.se) måste
# sättas vid körning så att form actions / CSRF fungerar bakom proxy.
CMD ["sh", "-c", "node scripts/migrate.mjs && node build"]
# Första admin: docker exec -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... <container> node scripts/seed.ts
