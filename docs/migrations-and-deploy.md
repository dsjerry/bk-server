# 数据库迁移与部署指南

## 迁移（Migration）工作流

项目已从 `synchronize: true` 切换到 migration 模式：表结构变更只能通过 `src/migrations/` 下的迁移文件驱动。

```shell
# 修改实体后，对比数据库生成新迁移（文件名自取，惯例用大驼峰描述变更）
npm run migration:generate -- src/migrations/AddFooToKeeping

# 执行所有未跑过的迁移（应用启动时也会自动执行，migrationsRun: true）
npm run migration:run

# 回滚最近一次迁移
npm run migration:revert

# 查看迁移执行状态
npm run migration:show
```

### 基线迁移说明

`src/migrations/1755300000000-InitSchema.ts` 是基线迁移，写成**幂等**形式：

- 全新数据库：`CREATE TABLE IF NOT EXISTS` 一步建齐所有表（含软删除列和索引）
- 旧的 synchronize 开发库：表已存在，通过 information_schema 判断后只补缺失的 `deleteAt` 列和索引，不动存量数据

### 索引效果验证（EXPLAIN）

迁移执行后，用下面的 SQL 验证同步接口的核心查询走了索引（`key` 列应显示 `idx_keeping_user_update_time`，`rows` 扫描量应显著小于全表）：

```sql
-- 模拟 getChangesSince：按用户 + 更新时间增量拉取
EXPLAIN SELECT * FROM keeping
WHERE createUserId = 1 AND updateTime > '2026-01-01' AND deleteAt IS NULL;

-- 模拟 localId -> serverId 映射反查
EXPLAIN SELECT * FROM keeping
WHERE createUserId = 1 AND localId = 'xxx';
```

### 常见问题

- **username 唯一索引创建失败**：存量数据有重复用户名，先去重再重跑 `npm run migration:run`
- **想临时用 synchronize 调试实体**：`.env` 里设 `DB_SYNCHRONIZE=true`（仅限本地，生产必须 false）

## Docker 部署

```shell
# 一键拉起 MySQL + MinIO + 应用（首次启动自动建库、自动跑迁移、自动建桶）
docker compose up -d --build

# 查看服务状态（app 带 healthcheck）
docker compose ps

# 查看日志
docker compose logs -f app
```

- 应用端口：`http://localhost:3031/v1`，接口文档 `http://localhost:3031/api-docs`
- MinIO 控制台：`http://localhost:9001`（minioadmin / minioadmin）
- 数据持久化：`mysql-data` / `minio-data` 卷 + `./uploads` 目录挂载
- 容器启动即自动执行未跑过的迁移，配合镜像滚动发布可保证"先迁库再起服务"

## ⚠️ /v1 破坏性变更

API 已启用 URI 版本控制（`app.enableVersioning`），所有路由从 `/keeping` 变为 **`/v1/keeping`**（auth、user、category 等同理）。

**存量客户端（React Native app）必须把 BASE_URL 加上 `/v1` 前缀**，否则会 404。
