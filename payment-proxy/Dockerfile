FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY payment-proxy ./payment-proxy

CMD ["node", "payment-proxy/index.js"]
