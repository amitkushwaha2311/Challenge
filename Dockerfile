# Stage 1: Build & Production Image for Google Cloud Run
FROM node:20-alpine AS runner

WORKDIR /app

# Set Cloud Run Production Environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev=false

# Copy application source code
COPY . .

# Build Vite frontend production bundle into /app/dist
RUN npm run build

# Remove development dependencies to keep image minimal & secure
RUN npm prune --production

# Cloud Run listens on PORT 8080
EXPOSE 8080

# Run the unified Express + Vite production server
CMD ["node", "server/server.js"]
