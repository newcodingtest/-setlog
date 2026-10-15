# syntax=docker/dockerfile:1
# No fixed platform: native arm64 on Apple Silicon, amd64 on Intel.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund
COPY . .
ARG VITE_SITE_URL=https://setlog.duckdns.org
ENV VITE_SITE_URL=${VITE_SITE_URL}
RUN npm run build

FROM nginx:stable-alpine AS runtime
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
