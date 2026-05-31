# Imagen base de Node.js
FROM node:18-alpine

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto de la aplicación
COPY . .

# Exponer puerto 443 (HTTPS)
EXPOSE 443

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=443

# Comando para iniciar la aplicación con HTTPS
CMD ["node", "backend/server-https.js"]
