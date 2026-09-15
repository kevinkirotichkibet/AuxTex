# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Baked into the client bundle at build time — must point wherever the
# BROWSER can reach the API (i.e. your host machine, not the Docker network).
ARG My_API_KEY=http://localhost:4000/api
ENV My_API_KEY=$My_API_KEY

RUN npm run build

# --- Production stage ---
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
