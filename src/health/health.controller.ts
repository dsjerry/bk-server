import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * 健康检查端点（免认证）。
 * 供 Docker HEALTHCHECK / K8s 探针 / 负载均衡探活使用：
 * 数据库连不上或内存超限时返回 503，编排系统据此摘除或重启实例。
 */
@ApiTags('健康检查')
@SkipThrottle() // 探针高频轮询，不占业务限流配额
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: '服务健康检查（数据库连通性 + 进程内存）' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      // 对数据库做一次真实 ping（SELECT 1），能发现连接池耗尽、网络不通等问题
      () => this.db.pingCheck('database'),
      // 堆内存超过 300MB 判定异常（按部署规格调整）
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
    ]);
  }
}
