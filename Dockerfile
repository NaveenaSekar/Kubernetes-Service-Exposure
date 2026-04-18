# WHAT: Defines how your app is packaged into a runnable container image.
# WHY: Kubernetes runs containers, not raw source code; the image must include Node + your app.

FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./
COPY public ./public

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

USER node
CMD ["node", "server.js"]
