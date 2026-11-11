# Dockerfile — Frontend 

# Build 
FROM node:20-alpine AS builder

WORKDIR /app

# Installer les dépendances
COPY package*.json ./
RUN npm ci --silent

# Copier les sources et builder
COPY . .
ENV VITE_API_URL=""
RUN npm run build

# Servir avec nginx 
FROM nginx:alpine

# Config nginx SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier le build
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
