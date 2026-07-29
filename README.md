# BK Server — NestJS 学习项目

> 记账类 App 后端，NestJS 11 + TypeORM + MySQL
>
> 配套前端：`D:\Dev\mobile\bk`（React Native）

## 项目结构

```
src/
├── auth/          # 认证（JWT + Passport）
├── user/          # 用户管理
├── keeping/       # 记账核心模块（含同步/冲突处理）
├── category/      # 分类管理
├── analysis/      # 分析模块
├── file/          # 文件管理
├── minio/         # MinIO 对象存储
├── chat/          # WebSocket（Socket.IO）
├── jwt/           # JWT 策略
├── guard/         # JwtGuard + RolesGuard
├── interceptor/   # 统一响应拦截器
├── filters/       # 全局异常过滤器
├── middleware/    # 日志中间件
├── decorator/     # 自定义装饰器
├── dto/           # 公共 DTO
├── entity/        # 数据实体
└── types/         # 类型定义
```

## ✅ 已实现

- NestJS 11 标准模块化架构
- JWT 认证（passport-jwt）+ 角色守卫
- Swagger API 文档（`/api-docs`）
- 统一响应格式（`ResponseInterceptor`）
- 全局异常处理（`HttpExceptionFilter`）
- MinIO 对象存储
- WebSocket 实时通信
- 多环境配置（`.env.development` / `.env.production`）
- 参数校验（class-validator）
- 客户端数据同步 + 冲突检测/解决
- Jest 单测 + e2e 测试框架

---

## 📋 TODO 清单

### 🔴 数据库优化（优先）

- [ ] **事务** — `keeping.service.ts` 的 `batchOperation()` 方法是逐条操作，没有事务包裹。改为 `@Transactional()` 或 QueryRunner 事务，确保批量操作的原子性
- [ ] **索引** — 所有 Entity 均未加 `@Index()`。优先给高频查询字段加索引：
  - `keeping` 表：`createUserId`、`updateTime`
  - 加完后用 `EXPLAIN SELECT ...` 验证效果
- [ ] **软删除** — 目前是物理删除（`repository.delete()`）。改为 TypeORM 的 `@DeleteDateColumn()` 软删除，查询时自动过滤已删除记录
- [ ] **数据库迁移** — 当前 `synchronize: true` 开发方便但生产危险。改为 migration 模式：
  ```shell
  typeorm migration:generate -d src/config/typeorm.config.ts src/migrations/Init
  ```

### 🟡 架构重构

- [ ] **DTO 与 Entity 分离** — Entity 上直接写了 `@Exclude()` 和业务注解，应创建专门的 Response DTO，Entity 只负责数据库映射
- [ ] **Service 拆分** — `keeping.service.ts` 285 行，同步/冲突逻辑可以抽成独立的 `SyncService`
- [ ] **API 版本控制** — 路由加上 `/v1/` 前缀，为后续接口升级留空间
- [ ] **Logger 中间件** — 当前只对 `user` 路由生效，改为全局日志（`forRoutes('*')`）

### 🟢 工程化

- [ ] **日志框架** — 替换 `console.log` / `console.error` 为 `@nestjs/common` 的 Logger 或 winston
- [ ] **Docker 化** — 添加 `Dockerfile` + `docker-compose.yml`（MySQL + MinIO + App）
- [ ] **CI/CD** — 添加 GitHub Actions 自动化测试和部署
- [ ] **Rate Limiting** — 接入 `@nestjs/throttler` 防止接口滥用
- [ ] **Health Check** — 添加 `/health` 健康检查端点

---

## 🚀 功能扩展建议

配套前端已有记账 CRUD、图表分析、地图、图片上传、AI 集成、主题切换等功能。以下是后端可以扩展的方向，按学习价值排序：

### 1. 🔍 全文搜索（最简单，立竿见影）

| 项目 | 内容 |
|---|---|
| **前端现状** | 记账列表有筛选，但没有搜索框 |
| **后端现状** | `findAll` 没有搜索参数 |
| **要做的** | 按备注（remark）、名称（name）模糊搜索 |
| **学到** | QueryBuilder 复杂查询、MySQL `LIKE` / 全文索引、搜索性能优化 |

### 2. 🔑 RBAC 权限体系（最实用）

| 项目 | 内容 |
|---|---|
| **前端现状** | `roles.decorator.ts` + `roles.guard.ts` 已定义但未真正使用 |
| **后端现状** | 只有 JWT 认证，没有角色/权限控制 |
| **要做的** | 建 `role` 表和 `user_role` 关联表；实现 `@Roles('admin')` 装饰器真正生效；管理员管理所有数据，普通用户只看自己的 |
| **学到** | Guard 执行机制、自定义装饰器、关联表设计、TypeORM ManyToMany |

### 3. 📊 数据导出（Excel/CSV）

| 项目 | 内容 |
|---|---|
| **前端现状** | 图表分析页面（ECharts），数据只能在线看 |
| **后端现状** | 分析模块只有基础 CRUD |
| **要做的** | 后端生成 Excel/CSV 文件流，前端下载或分享 |
| **学到** | 文件流处理、`@Res()` 直接操作响应、StreamableFile、`js-xlsx` |

### 4. ⏰ 定时任务 + 推送（最有趣）

| 项目 | 内容 |
|---|---|
| **前端现状** | 无相关功能 |
| **后端现状** | 无定时任务 |
| **要做的** | 每月 1 号生成上月账单摘要，通过 WebSocket 推送给前端 |
| **学到** | `@nestjs/schedule`、Cron 表达式、WebSocket 推送、Service 间调用 |

### 5. 🚀 缓存（Redis）

| 项目 | 内容 |
|---|---|
| **前端现状** | 分析页面每次打开都请求数据 |
| **后端现状** | 分析接口每次都查数据库 |
| **要做的** | 图表统计数据缓存 5 分钟，分类列表缓存 |
| **学到** | `@nestjs/cache-manager`、`@UseInterceptors(CacheInterceptor)`、缓存策略、Redis 集成 |

### 6. 📋 审计日志

| 项目 | 内容 |
|---|---|
| **前端现状** | 无 |
| **后端现状** | 谁改了什么都查不到 |
| **要做的** | 记录每次增删改操作：谁、什么时候、改了哪个表、旧值/新值 |
| **学到** | AOP 思想、自定义 Decorator、TypeORM `@AfterUpdate` / `@AfterInsert` 订阅者（Subscriber） |

### 7. 📈 数据看板（Dashboard）

| 项目 | 内容 |
|---|---|
| **前端现状** | 分析页面有图表，但首页没有概览 |
| **后端现状** | `analysis` 模块比较单薄 |
| **要做的** | 首页展示：本月支出/收入、环比变化、分类占比 |
| **学到** | TypeORM 聚合查询（`SUM`、`GROUP BY`）、复杂 DTO 设计、前后端数据流 |

---

## 📦 Node.js 核心 API 学习清单

NestJS 底层是 Node.js，以下场景需要直接操作 Node.js 原生 API。每个功能都对应一个具体的 Node.js 知识点，建议按顺序实现。

### 1. 📁 CSV 导出（stream + fs + path）

| 项目 | 内容 |
|---|---|
| **场景** | 用户点击"导出记账数据"为 CSV 文件 |
| **Node API** | `fs.createWriteStream()`、`path.join()`、`stream.pipeline()` |
| **学到** | 流式写入不占内存、路径跨平台处理、管道传输 |
| **代码骨架** | |
```typescript
import { createWriteStream } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream';

async exportCSV(userId: number) {
  const filePath = join(__dirname, '../../temp', `export_${userId}.csv`);
  const ws = createWriteStream(filePath);
  // 流式写入 CSV 头 + 数据行
  // 完成后返回下载链接
}
```

### 2. 🔐 敏感数据加密（crypto + buffer）

| 项目 | 内容 |
|---|---|
| **场景** | 用户备注等敏感信息加密存储，只有本人能解密查看 |
| **Node API** | `crypto.createCipheriv()`、`crypto.createDecipheriv()`、`Buffer` |
| **学到** | 对称加密（AES-256-GCM）、IV 管理、二进制编解码 |
| **代码骨架** | |
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPT_KEY!, 'hex');

function encrypt(text: string): { encrypted: string; iv: string; tag: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  // ...
}
```

### 3. 📊 服务器健康监控（os + process）

| 项目 | 内容 |
|---|---|
| **场景** | 部署后通过 `/health` 端点查看服务器状态 |
| **Node API** | `os.cpus()`、`os.totalmem()`、`os.freemem()`、`os.uptime()`、`process.memoryUsage()` |
| **学到** | 系统信息获取、进程监控、性能指标 |
| **代码骨架** | |
```typescript
import { cpus, totalmem, freemem, uptime } from 'os';

@Get('/health')
getHealth() {
  return {
    cpu: cpus().length,
    memory: { total: totalmem(), free: freemem(), usage: process.memoryUsage() },
    uptime: process.uptime(),
    timestamp: new Date(),
  };
}
```

### 4. ⚡ 事件驱动解耦（events）

| 项目 | 内容 |
|---|---|
| **场景** | 新增一笔记账 → 自动触发更新月度统计缓存 |
| **Node API** | `EventEmitter`（或 NestJS `@nestjs/event-emitter`） |
| **学到** | 观察者模式、解耦 Service 间调用、事件循环 |
| **代码骨架** | |
```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

// keeping.service.ts
await this.keepingRepository.save(keeping);
this.eventEmitter.emit('keeping.created', { userId, keeping });

// analysis.service.ts
@OnEvent('keeping.created')
handleKeepingCreated(payload: KeepingEvent) {
  // 更新缓存
}
```

### 5. 🖨️ 月度账单 PDF（child_process + stream）

| 项目 | 内容 |
|---|---|
| **场景** | 每月 1 号自动生成 PDF 账单，通过 WebSocket 通知用户 |
| **Node API** | `child_process.exec()` / `spawn()`、`stdout` 流处理 |
| **学到** | 子进程管理、调用系统工具、超时/错误处理 |
| **代码骨架** | |
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async generatePDF(html: string, outputPath: string) {
  await execAsync(`wkhtmltopdf "${html}" "${outputPath}"`, { timeout: 30000 });
}
```

### 6. 🚀 多进程部署（cluster）

| 项目 | 内容 |
|---|---|
| **场景** | 生产环境利用多核 CPU，提高吞吐量 |
| **Node API** | `cluster.fork()`、进程间通信、优雅重启 |
| **学到** | Node.js 单线程模型、多进程架构、负载均衡 |
| **代码骨架** | |
```typescript
import cluster from 'cluster';
import { cpus } from 'os';

if (cluster.isPrimary) {
  for (let i = 0; i < cpus().length; i++) cluster.fork();
  cluster.on('exit', (worker) => cluster.fork());
} else {
  bootstrap(); // 启动 NestJS
}
```

### 7. 🗜️ 数据压缩下载（zlib + stream）

| 项目 | 内容 |
|---|---|
| **场景** | 大数据导出时压缩文件，减少下载时间 |
| **Node API** | `zlib.createGzip()`、`stream.pipeline()` |
| **学到** | 压缩算法、流式管道组合 |
| **代码骨架** | |
```typescript
import { createGzip } from 'zlib';
import { pipeline } from 'stream';
import { createReadStream, createWriteStream } from 'fs';

pipeline(
  createReadStream(inputPath),
  createGzip(),
  createWriteStream(outputPath),
  (err) => { /* 完成或报错 */ }
);
```

### 8. 📝 逐行日志分析（readline）

| 项目 | 内容 |
|---|---|
| **场景** | 分析日志文件，统计请求频率、错误率 |
| **Node API** | `readline.createInterface()` |
| **学到** | 逐行读取大文件、内存友好 |
| **代码骨架** | |
```typescript
import { createInterface } from 'readline';
import { createReadStream } from 'fs';

const rl = createInterface({ input: createReadStream('access.log') });
for await (const line of rl) {
  // 逐行分析
}
```

### 推荐实现顺序

```
第1步：CSV 导出（stream + fs + path）
  → 最实用，bk-server 已有记账数据，导出是自然需求
  → 学会流式处理，以后处理大文件都是这个思路

第2步：健康监控（os + process）
  → 最简单，几行代码就能看到效果
  → 部署后随时查看服务器状态

第3步：事件驱动（events）
  → 理解 Node.js 事件循环
  → 优化 Service 之间的耦合

第4步：加密存储（crypto + buffer）
  → 安全相关，面试常问
  → 理解对称加密 vs 非对称加密

第5步：PDF 生成（child_process）
  → 调用外部工具，理解进程管理
  → 用到 stream 管道

第6步：多进程（cluster）
  → 生产环境优化
  → 理解 Node.js 单线程模型

第7步：数据压缩（zlib + stream）
  → 配合 CSV 导出使用
  → 深入理解流式管道

第8步：日志分析（readline）
  → 运维场景
  → 大文件逐行处理
```

---

## 🧪 推荐学习路线

### 第一阶段：打好基础（现有代码优化）

| # | 任务 | 学到什么 |
|---|---|---|
| 1 | 给 `batchOperation` 加事务 | 事务的原子性、`@Transactional()` / QueryRunner |
| 2 | 给 `createUserId`、`updateTime` 加索引 + EXPLAIN 验证 | 索引原理、执行计划分析 |
| 3 | 所有表改为软删除 | `@DeleteDateColumn()`、查询过滤机制 |
| 4 | 用 QueryBuilder 重写 `getChangesSince` | TypeORM 进阶查询、链式调用 |
| 5 | 对照 `ecdp-cloud` 的 XML SQL，用 TypeORM 重写一个复杂 JOIN | ORM 与原生 SQL 的思维差异 |

### 第二阶段：功能扩展（前后端联动）

| # | 任务 | 学到什么 |
|---|---|---|
| 6 | 给记账列表加搜索功能 | QueryBuilder + LIKE / 全文索引 |
| 7 | 实现 RBAC 权限控制 | Guard + Decorator + ManyToMany |
| 8 | 数据导出 Excel | 文件流、StreamableFile |
| 9 | 定时生成月账单 + WebSocket 推送 | `@nestjs/schedule` + WebSocket |
| 10 | 分析接口加 Redis 缓存 | `@nestjs/cache-manager` |
| 11 | 审计日志 | TypeORM Subscriber、AOP |
| 12 | 首页数据看板 | 聚合查询、GROUP BY |

### 第三阶段：Node.js 核心 API 实践

| # | 任务 | Node API | 学到什么 |
|---|---|---|---|
| 13 | CSV 导出 | `fs` + `stream` + `path` | 流式写入、管道 |
| 14 | 健康监控端点 | `os` + `process` | 系统信息 |
| 15 | 事件驱动解耦 | `EventEmitter` | 观察者模式 |
| 16 | 敏感数据加密 | `crypto` + `buffer` | 对称加密 |
| 17 | 月度账单 PDF | `child_process` | 子进程管理 |
| 18 | 数据压缩下载 | `zlib` + `stream` | 压缩流 |
| 19 | 日志分析 | `readline` | 逐行处理 |
| 20 | 多进程部署 | `cluster` | 多核利用 |

---

## 运行

```shell
# 安装
npm install

# 开发（热更新）
npm run start:dev

# 生产构建
npm run build
npm run start:prod

# 测试
npm test
npm run test:e2e
```

## 环境变量

参考 `.env.example`，配置数据库和 MinIO 连接信息。
