# ---- builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install root deps (if needed by build tooling)
COPY package*.json ./
RUN npm ci

# Install client deps
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci

# Copy source
COPY . /app

# Build client with base path
# Vite: (default) --base=/RS3QuestBuddyEditor/
# CRA: use PUBLIC_URL env instead; uncomment CRA and comment Vite
RUN npm --prefix /app/client run build -- --base=/RS3QuestBuddyEditor/
# For CRA, instead use:
# RUN sh -c 'cd /app/client && PUBLIC_URL=/RS3QuestBuddyEditor npm run build'

# ---- runtime ----
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Clean default content
RUN rm -rf ./*

# Copy built assets (adjust path if CRA build folder differs)
# Vite default: client/dist
COPY --from=builder /app/client/dist ./ 
# If CRA: COPY --from=builder /app/client/build ./

# Optional cache headers via custom nginx config (not required)
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]