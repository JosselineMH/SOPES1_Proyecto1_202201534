# Dockerfile para React sin Vite y sin nginx
FROM node:18-alpine

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar todas las dependencias
RUN npm ci

# Copiar el código fuente
COPY . .

# Variables de entorno para build
ARG REACT_APP_HOST
ARG REACT_APP_PORT
ENV REACT_APP_HOST=$REACT_APP_HOST
ENV REACT_APP_PORT=$REACT_APP_PORT

# Construir la aplicación
RUN npm run build

# Exponer puerto 3000
EXPOSE 3000

# Ejecutar el servidor Express
CMD ["npm", "run", "serve"]