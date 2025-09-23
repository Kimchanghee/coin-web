# Build stage
FROM node:20 AS builder

WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm install

# 소스 코드 복사
COPY . .

# React 앱 빌드 (build/ 폴더 생성됨)
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# 빌드된 정적 파일 복사 (dist가 아닌 build 폴더)
COPY --from=builder /app/build ./build

# serve 패키지 전역 설치 (정적 파일 서빙용)
RUN npm install -g serve

# 포트 설정
EXPOSE 3000

# serve를 사용하여 빌드된 앱 실행
CMD ["serve", "-s", "build", "-l", "3000"]
