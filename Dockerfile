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
# If you updated webpack.config.js output.publicPath to /RS3QuestBuddyEditor/,
# this can be just `npm run build`. Keeping PUBLIC_URL is optional.
RUN sh -c 'cd /app/client && PUBLIC_URL=/RS3QuestBuddyEditor npm run build'

# ---- runtime ----
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

# Webpack output goes to client/dist (not build)
COPY --from=builder /app/client/dist ./

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]