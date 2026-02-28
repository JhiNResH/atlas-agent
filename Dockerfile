FROM node:20-slim
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production=false

COPY tsconfig.json ./
COPY bin/ ./bin/
COPY src/ ./src/
COPY references/ ./references/

# Create data dir for usage logs (mount a Railway volume here for persistence)
RUN mkdir -p /app/data

CMD ["node_modules/.bin/tsx", "src/seller/runtime/seller.ts"]
