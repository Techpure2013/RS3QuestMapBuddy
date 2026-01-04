# ---- builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install root deps (if any)
COPY package*.json ./
RUN npm ci

# Install client deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Copy source
WORKDIR /app
COPY . .

# Build for subpath /RS3QuestBuddyEditor/
# NODE_ENV=production enables chunking and contenthash for cache busting
RUN sh -c 'cd /app && NODE_ENV=production PUBLIC_URL=/RS3QuestBuddyEditor npm run build'

# ---- runtime ----
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

# Webpack output goes to client/dist (not build)
COPY --from=builder /app/dist ./

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]