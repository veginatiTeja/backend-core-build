# ---------- STAGE 1: BUILD ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Install all dependencies (including dev if needed)
RUN npm install

COPY . .

# ---------- STAGE 2: PRODUCTION ----------
FROM node:20-alpine

WORKDIR /app

# Copy only required files from builder
COPY --from=builder /app .

# Remove dev dependencies
RUN npm prune --omit=dev

EXPOSE 5000

CMD ["node", "src/server.js"]