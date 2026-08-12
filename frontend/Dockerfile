# Etapa 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./
RUN npm install

# Copia o código fonte e faz o build
COPY . .
RUN npm run build

# Etapa 2: Servidor Web (Nginx)
FROM nginx:alpine

# Copia o build do Vite para a pasta pública do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia configuração customizada do Nginx para suportar roteamento SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
