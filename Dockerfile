# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json ./
# Using npm install instead of ci to be safe if lockfile is missing
RUN npm install

# Copy source code
COPY . .

# Build Vite app to /dist
RUN npm run build

# Stage 2: Serve the application
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies for the server
COPY package.json ./
RUN npm install --production

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY server.js .

# Environment setup
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]