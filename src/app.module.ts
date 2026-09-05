import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { KeepingModule } from './keeping/keeping.module';
import { JwtModule } from './jwt/jwt.module';
import { CategoryModule } from './category/category.module';
import { FileModule } from './file/file.module';
import { AnalysisModule } from './analysis/analysis.module';
import { MinioModule } from './minio/minio.module';
import { HealthModule } from './health/health.module';
import { AiModule } from './ai/ai.module';
import { LoggerMiddleWare } from './middleware/logger.middleware';

@Module({
  imports: [
    UserModule,
    AuthModule,
    KeepingModule,
    JwtModule,
    CategoryModule,
    // 配置文件
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    // 数据库配置
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: Number(config.get('DB_PORT')),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        // 使用 autoLoadEntities 就不需要设置 entities
        autoLoadEntities: true,
        // 表结构变更一律走 migration（src/migrations/）。生产环境绝不能开 synchronize：
        // 它会在启动时直接按实体改表，可能造成丢列丢数据。仅本地调试实体时
        // 通过 DB_SYNCHRONIZE=true 临时打开
        synchronize: config.get('DB_SYNCHRONIZE') === 'true',
        // 启动时自动执行未跑过的迁移（等效 npm run migration:run），
        // Docker / CI 环境无需单独执行迁移命令
        migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
        migrationsRun: true,
      }),
    }),
    FileModule,
    AnalysisModule,
    MinioModule,
    HealthModule,
    AiModule,
    // 全局限流：默认 100 次/分钟，可用 THROTTLE_TTL / THROTTLE_LIMIT 环境变量调整。
    // 计数存进程内存，单实例够用；多实例部署需换 Redis 存储
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: Number(config.get('THROTTLE_TTL')) || 60_000,
          limit: Number(config.get('THROTTLE_LIMIT')) || 100,
        },
      ],
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 注册为全局 Guard，所有路由默认限流；
    // 个别路由可用 @SkipThrottle() 跳过或 @Throttle() 单独收紧（见 auth.controller）
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 全局请求日志。Nest 11 基于 Express 5，通配符要写 {*splat}（旧的 '*' 语法已废弃）
    consumer.apply(LoggerMiddleWare).forRoutes('{*splat}');
  }
}
