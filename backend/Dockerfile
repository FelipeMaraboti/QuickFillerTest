FROM node:20-alpine

# Instala dependências nativas para o Tesseract.js e utilitários
RUN apk add --no-cache python3 make g++ \
    cairo-dev pango-dev libjpeg-turbo-dev giflib-dev \
    librsvg-dev pixman-dev font-noto

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Roda o prisma generate para tipagens
RUN npx prisma generate

EXPOSE 3333

# Comando para rodar migrações (cria o dev.db se não existir) e rodar a API
CMD ["sh", "-c", "npx prisma db push && npm run dev"]
