# Build static site; final stage is only `dist/` on `scratch` (artifact-style image).
# Requires BuildKit (default in recent Docker) for the npm cache mount.
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
RUN npm run build

FROM scratch AS export
COPY --from=builder /app/dist /
