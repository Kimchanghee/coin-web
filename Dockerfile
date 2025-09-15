# ----------------------
# 1단계: React 프런트 빌드 (Vite => dist/)
# ----------------------
FROM node:20 AS builder
WORKDIR /app

COPY package*.json ./
# lock 파일이 없으므로 npm install 사용
RUN npm install

COPY . .
RUN npm run build  # => dist/ 생성

# ----------------------
# 2단계: 런타임 - server/ 사용
# ----------------------
FROM node:20
WORKDIR /app

# 프런트 산출물
COPY --from=builder /app/dist ./dist

# 서버 의존성 (server/package.json 기준)
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# 서버 소스
COPY server ./server

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/server.js"]
