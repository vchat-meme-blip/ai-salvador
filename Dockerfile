# Use Node.js LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Build-time env for Vite (set via --build-arg), with safe defaults
ARG VITE_ADMIN=0
ARG VITE_CONVEX_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_ADMIN=$VITE_ADMIN \
    VITE_CONVEX_URL=$VITE_CONVEX_URL \
    VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose ports
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]