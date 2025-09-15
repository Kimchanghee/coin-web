# ----------------------
# 1단계: React 프론트엔드 빌드
# ----------------------
FROM node:18 AS builder
WORKDIR /app

# 패키지 설치
COPY package*.json ./
RUN npm install

# 소스 복사 및 React 빌드
COPY . .
RUN npm run build   # /app/build 폴더 생성

# ----------------------
# 2단계: Node.js 서버 실행
# ----------------------
FROM node:18
WORKDIR /app

# backend 및 build 결과만 복사
COPY --from=builder /app/build ./build
COPY backend ./backend
COPY package*.json ./
RUN npm install --production

# 환경 변수
ENV PORT=8080
EXPOSE 8080

# Express 서버 실행 (backend/server.js)
CMD ["node", "backend/server.js"]
