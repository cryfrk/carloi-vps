FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY server ./server
COPY admin ./admin
COPY docker ./docker
COPY scripts ./scripts
COPY .env.example ./.env.example
COPY .env.vps.example ./.env.vps.example
COPY README.md ./README.md
COPY PRODUCTION_SETUP.md ./PRODUCTION_SETUP.md

RUN mkdir -p /app/uploads
RUN chmod +x /app/docker/start-api.sh

EXPOSE 8080

CMD ["sh", "/app/docker/start-api.sh"]
