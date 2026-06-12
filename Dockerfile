# ---- Stage 1: build the React client --------------------------------------
FROM cgr.dev/chainguard/node:latest-dev AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# ---- Stage 2: server runtime ----------------------------------------------
FROM cgr.dev/chainguard/node:latest-dev AS server
WORKDIR /app/server

# build tools so better-sqlite3 can compile its native binding if no prebuilt
RUN apk add --no-cache python3 make g++

COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/ ./

# bundle the built client so the server can serve it on one port
COPY --from=client-build /app/client/dist ./public

ENV NODE_ENV=production
ENV PORT=8787
ENV DATA_DIR=/data
EXPOSE 8787
VOLUME ["/data"]
CMD ["node", "index.js"]
