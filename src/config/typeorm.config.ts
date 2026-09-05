import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Keeping } from 'src/entity/keeping.entity';
import { User } from 'src/entity/user.entity';
import { Category } from 'src/entity/category.entity';
import { File } from 'src/entity/file.entity';
import { Analysis } from 'src/analysis/entities/analysis.entity';

/**
 * TypeORM CLI 专用数据源（migration:generate / run / revert），
 * 与 app.module.ts 里的运行时配置保持一致。
 *
 * 环境变量优先级：进程环境变量（Docker / CI 注入）> .env.${NODE_ENV} 文件（本地开发）。
 * dotenv 默认不覆盖已存在的进程变量，正好实现这个语义。
 */
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [Keeping, User, Category, File, Analysis],
  // CLI 场景永远 false：结构变更只能由迁移文件驱动
  synchronize: false,
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsRun: false,
});
