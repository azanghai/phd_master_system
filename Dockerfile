FROM node:22-alpine AS build

WORKDIR /workspace
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /workspace
ENV NODE_ENV=production \
    PHD_WORKBENCH_HOST=0.0.0.0 \
    PHD_WORKBENCH_PORT=47637 \
    PHD_WORKBENCH_DATA_DIR=/data

COPY --from=build /workspace/app ./app
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/scripts/server.mjs ./scripts/server.mjs
COPY --from=build /workspace/server ./server

EXPOSE 47637
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:47637/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "./scripts/server.mjs"]
