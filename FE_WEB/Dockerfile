# Stage 1: Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package dependencies
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the production assets
RUN npm run build

# Stage 2: Production serve stage using Nginx
FROM nginx:alpine

# Copy built assets from Build stage to Nginx web root
COPY --from=build /app/dist /usr/share/nginx/html

# Copy a custom nginx configuration to support SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
