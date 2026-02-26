FROM node:20-alpine AS base

WORKDIR /app

# Dependencies installieren (prisma ist jetzt in dependencies)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Prisma generieren
COPY prisma ./prisma
RUN npx prisma generate

# App-Code kopieren
COPY src ./src

# Nicht als root laufen
RUN addgroup -g 1001 -S novarix && \
    adduser -S novarix -u 1001
USER novarix

# Railway setzt PORT dynamisch
EXPOSE ${PORT:-3000}

# Migrations bei Start ausführen, dann Server starten
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
