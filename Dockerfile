# ---- builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Root deps (if needed)
COPY package*.json ./
RUN npm ci

# Client deps
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci

# Copy source
WORKDIR /app
COPY . .

# CRA/webpack build at subpath /RS3QuestBuddyEditor/
RUN sh -c 'cd /app/client && PUBLIC_URL=/RS3QuestBuddyEditor npm run build'

# ---- runtime ----
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

# CRA build output goes to client/build
COPY --from=builder /app/client/build ./

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]