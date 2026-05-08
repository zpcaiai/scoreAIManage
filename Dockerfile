# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (need dev dependencies for Next.js build)
RUN npm ci

# Copy application code
COPY . .

# Build Next.js
RUN npm run build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Configure for Hugging Face Spaces / Render
ENV PORT=7860
EXPOSE 7860

# Start the application
CMD ["npm", "start"]
