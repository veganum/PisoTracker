# ---- Etapa 1: build de la app Angular ----
FROM node:22-alpine AS build
WORKDIR /app

# Instala dependencias con la lockfile (cache eficiente)
COPY package*.json ./
RUN npm ci

# Copia el resto del código y compila en producción
COPY . .
RUN npm run build

# ---- Etapa 2: servir los estáticos con nginx ----
FROM nginx:alpine

# Config con fallback SPA para el routing de Angular
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia el output del build (Angular 22 → dist/pisotracker/browser)
COPY --from=build /app/dist/pisotracker/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
