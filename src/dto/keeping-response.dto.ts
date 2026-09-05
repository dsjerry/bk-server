import { ApiProperty } from '@nestjs/swagger';
import { Keeping } from 'src/entity/keeping.entity';

/**
 * 记账响应 DTO —— 出参专用，与 Entity 解耦：
 * Entity 只负责数据库映射（表结构），对外输出一律走这个白名单式 DTO，
 * 新增字段必须显式加进来才会返回，避免误把内部字段（如后续的审计信息）带出去。
 */
export class KeepingResponseDto {
  @ApiProperty({ description: '服务端自增ID' })
  id: number;

  @ApiProperty({ description: '客户端本地ID', required: false })
  localId?: string;

  @ApiProperty({ description: '所属用户ID' })
  createUserId: number;

  @ApiProperty({ description: '名称' })
  name: string;

  @ApiProperty({ description: '交易类型' })
  transactionType: number;

  @ApiProperty({ description: '分类', required: false })
  category?: number;

  @ApiProperty({ description: '金额' })
  amount: number;

  @ApiProperty({ description: '位置', required: false })
  position?: string;

  @ApiProperty({ description: '图片', required: false })
  image?: string;

  @ApiProperty({ description: '备注', required: false })
  remark?: string;

  @ApiProperty({ description: '创建时间' })
  createTime: Date;

  @ApiProperty({ description: '更新时间' })
  updateTime: Date;

  @ApiProperty({ description: '币种', required: false })
  currency?: string;

  @ApiProperty({ description: '分类 tag 别名（逗号分隔）', required: false })
  tags?: string;

  @ApiProperty({ description: '地点经度', required: false })
  longitude?: number;

  @ApiProperty({ description: '地点纬度', required: false })
  latitude?: number;
}

export function toKeepingResponse(keeping: Keeping): KeepingResponseDto {
  return {
    id: keeping.id,
    localId: keeping.localId,
    createUserId: keeping.createUserId,
    name: keeping.name,
    transactionType: keeping.transactionType,
    category: keeping.category,
    amount: keeping.amount,
    position: keeping.position,
    image: keeping.image,
    remark: keeping.remark,
    createTime: keeping.createTime,
    updateTime: keeping.updateTime,
    currency: keeping.currency,
    tags: keeping.tags,
    longitude: keeping.longitude,
    latitude: keeping.latitude,
  };
}
