# Build stage
FROM node:20 AS builder

WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm install

# 소스 코드 복사
COPY . .

# React 앱 빌드
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# 빌드된 정적 파일 복사
COPY --from=builder /app/build ./build

# serve 패키지 전역 설치
RUN npm install -g serve

# Cloud Run은 PORT 환경변수를 사용
# 기본값은 8080
ENV PORT=8080

# PORT 환경변수 사용
EXPOSE 8080

# serve 실행 시 PORT 환경변수 사용
CMD serve -s build -l $PORT
