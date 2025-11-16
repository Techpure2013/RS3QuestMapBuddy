# ---- builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps from root package.json
COPY package*.json ./
RUN npm ci

# Copy the rest of the source and build with base path
COPY . .
ENV PUBLIC_URL=/RS3QuestBuddyEditor
RUN npm run build

# ---- runtime ----
FROM nginx:alpine AS runner
# create subpath and copy dist output into it
RUN mkdir -p /usr/share/nginx/html/RS3QuestBuddyEditor
COPY --from=builder /app/dist /usr/share/nginx/html/RS3QuestBuddyEditor


EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]