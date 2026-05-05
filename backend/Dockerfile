FROM node:20-bookworm-slim

# ffmpeg + minimal libs needed by sharp's prebuilt binary
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY backend/. ./

RUN mkdir -p uploads exports

ENV NODE_ENV=production \
    PORT=10000 \
    UPLOAD_DIR=uploads \
    EXPORT_DIR=exports

EXPOSE 10000

CMD ["node", "server.js"]
