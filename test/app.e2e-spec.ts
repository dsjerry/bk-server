import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * e2e 需要 MySQL（AppModule 启动时会连库并自动跑迁移）。
 * 本地没有注入 DB_* 环境变量时自动跳过；CI 里由 service 容器提供数据库。
 */
const describeWithDb = process.env.DB_HOST ? describe : describe.skip;

describeWithDb('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // 与 main.ts 保持一致：否则测到的路由前缀和生产不一致
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1 返回欢迎语（ResponseInterceptor 包装）', () => {
    return request(app.getHttpServer())
      .get('/v1')
      .expect(200)
      .expect((res) => {
        // ResponseInterceptor 统一包装为 { code, data, message, success, timestamp }
        const body = res.body as { code: number; data: string };
        expect(body.code).toBe(200);
        expect(body.data).toContain('/api-docs');
      });
  });

  it('GET /v1/health 健康检查可用（数据库连通）', () => {
    return request(app.getHttpServer())
      .get('/v1/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as { data: { status: string } };
        expect(body.data.status).toBe('ok');
      });
  });
});
