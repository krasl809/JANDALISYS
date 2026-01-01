# Stage 1: Build React app
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY client/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY client/ .

# Build the application
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine

# Copy build files from previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
