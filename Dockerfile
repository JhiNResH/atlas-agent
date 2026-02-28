FROM node:20-slim
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production=false

COPY tsconfig.json ./
COPY bin/ ./bin/
COPY src/ ./src/
COPY references/ ./references/

CMD ["node_modules/.bin/tsx", "src/seller/runtime/seller.ts"]
