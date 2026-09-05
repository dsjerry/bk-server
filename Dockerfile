# syntax=docker/dockerfile:1

# ---------- 依赖安装层：只 COPY lock 文件，代码变动时命中缓存不重装依赖 ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- 构建层：编译 TypeScript ----------
FROM deps AS build
COPY . .
RUN npm run build

# ---------- 运行层：只带生产依赖 + 编译产物，镜像最小化 ----------
# 基底选 Debian slim 而非 alpine：bcrypt 的预编译二进制依赖 glibc，
# alpine(musl) 需要额外装 python3/make/g++ 现场编译
FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# 非 root 运行，降低容器被攻破后的影响面
USER node
EXPOSE 3031

# 容器级健康检查打 /health 端点（Node 22 自带 fetch，不用装 curl）
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3031/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# 启动即自动执行未跑过的数据库迁移（app.module 中 migrationsRun: true），
# 配合滚动发布天然保证"先迁库再起服务"
CMD ["node", "dist/main"]
