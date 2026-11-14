# syntax=docker/dockerfile:1

# ---- dependencies -------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- runtime ------------------------------------------------------------
FROM node:24-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    TRUST_PROXY=0

WORKDIR /app

# Never run the API as root.
RUN addgroup -S app && adduser -S app -G app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

USER app

EXPOSE 3000

# The container is only healthy when the API answers; no shell, no curl.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
