# Multi-stage build for production
FROM node:18-alpine AS backend-build

# Set working directory for backend
WORKDIR /app

# Copy backend package files
COPY package*.json ./
COPY backend/ ./backend/

# Install backend dependencies
RUN npm ci --only=production

# Frontend build stage
FROM node:18-alpine AS frontend-build

# Set working directory for frontend
WORKDIR /app/frontend

# Copy frontend package files
COPY tdil-frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY tdil-frontend/ ./

# Build frontend for production
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy backend from build stage
COPY --from=backend-build --chown=nodejs:nodejs /app .

# Copy built frontend
COPY --from=frontend-build --chown=nodejs:nodejs /app/frontend/dist ./public

# Create necessary directories
RUN mkdir -p backend/uploads && chown -R nodejs:nodejs backend/uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
