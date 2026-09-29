FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY index.ts ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS runtime

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node public ./public

ENV NODE_ENV=production
ENV PORT=3000

USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
