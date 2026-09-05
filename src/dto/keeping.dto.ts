import { IsString, IsNumber, IsOptional, IsIn, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { KeepingResponseDto } from 'src/dto/keeping-response.dto';
import { PaginationDto } from 'src/dto/pagination.dto';
export class KeepingCreateDto {
  @ApiProperty({ description: '名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '交易类型' })
  @IsNumber()
  transactionType: number;

  @ApiProperty({ description: '金额' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: '位置' })
  @IsString()
  position: string;

  @ApiProperty({ description: '图片' })
  @IsString()
  image: string;

  @ApiProperty({ description: '备注' })
  @IsString()
  remark: string;

  @ApiProperty({ description: '本地id' })
  @IsString()
  localId: string;

  // ---- 以下为可选扩展字段：旧客户端不传也能通过校验 ----

  @ApiProperty({ description: '分类 tag 别名（逗号分隔）', required: false })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiProperty({ description: '币种', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: '地点经度', required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ description: '地点纬度', required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;
}

/**
 * 记账列表过滤参数（GET /keeping 的查询串）。
 * 全部可选：不传 = 该用户全量分页；组合传 = 服务端过滤，
 * 让客户端的 FilterByPane / 时间筛选可以直接接服务端
 */
export class KeepingFilterDto extends PaginationDto {
  @ApiProperty({ description: '关键字（匹配名称/备注/地点）', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '交易类型过滤', enum: [1, 2], required: false })
  @IsOptional()
  @IsIn([1, 2])
  transactionType?: number;

  @ApiProperty({ description: '分类 tag 别名（单个）', required: false })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiProperty({ description: '起始日期（含），ISO 格式', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: '结束日期（含），ISO 格式', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class KeepingUpdateDto extends PartialType(KeepingCreateDto) {
  @ApiProperty({ description: 'id' })
  id: number;

  @ApiProperty({ description: '更新时间' })
  updateTime: Date;
}

class Meta {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  lastPage: number;
}

export class PaginatedKeepingResponse {
  @ApiProperty({ type: [KeepingResponseDto] })
  items: KeepingResponseDto[];

  @ApiProperty()
  meta: Meta;
}

export class KeepingBatchDto {
  @ApiProperty({ type: [KeepingCreateDto], description: '待创建的记账' })
  creates?: KeepingCreateDto[];

  @ApiProperty({ type: [KeepingUpdateDto], description: '待更新的记账' })
  updates?: KeepingUpdateDto[];

  @ApiProperty({ type: [Number], description: '待删除的记账id' })
  deletes?: number[];
}

/**
 * 同步响应里的服务端变更（出参专用）。
 * 与请求用的 KeepingBatchDto 分开：响应侧 creates 是服务端全量快照（KeepingResponseDto），
 * 复用请求 DTO 会导致入参校验规则（必填字段）错误地约束出参结构
 */
export class ServerChangesDto {
  @ApiProperty({ type: [KeepingResponseDto], description: '服务端全量快照' })
  creates?: KeepingResponseDto[];

  @ApiProperty({ type: [KeepingUpdateDto], description: '服务端增量更新' })
  updates?: KeepingUpdateDto[];

  @ApiProperty({ type: [Number], description: '服务端增量删除的记账id' })
  deletes?: number[];
}

export enum ConflictType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export class ConflictItem {
  @ApiProperty({ enum: ConflictType })
  type: ConflictType;

  @ApiProperty({ description: '客户端版本数据' })
  clientVersion: KeepingUpdateDto | null;

  @ApiProperty({ description: '服务端版本数据' })
  serverVersion: KeepingResponseDto | null;

  @ApiProperty({ description: '冲突发生时间' })
  conflictSince: string;
}

export class ConflictResolution {
  @ApiProperty({ enum: ConflictType, description: '冲突类型' })
  type: ConflictType;

  @ApiProperty({ description: '解决后的数据' })
  resolvedData: KeepingUpdateDto;

  @ApiProperty({ enum: ['client', 'server', 'merge'], description: '解决策略' })
  strategy: 'client' | 'server' | 'merge';
}

export class SyncPayload {
  @ApiProperty({ description: '客户端最后同步时间戳' })
  lastSyncAt: string;

  @ApiProperty({ type: KeepingBatchDto })
  changes: KeepingBatchDto;

  @ApiProperty({ type: [ConflictResolution], required: false })
  resolutions?: ConflictResolution[];
}

export class IdMapping {
  @ApiProperty({ description: '客户端本地ID' })
  localId: string;

  @ApiProperty({ description: '服务端ID' })
  serverId: number;
}

export class SyncResult {
  @ApiProperty({ description: '服务端当前时间戳' })
  serverTime: string;

  @ApiProperty({ type: [ConflictItem] })
  conflicts: ConflictItem[];

  @ApiProperty({ type: ServerChangesDto })
  serverChanges: ServerChangesDto;

  @ApiProperty({ type: [IdMapping], description: '本地ID与服务端ID的映射关系' })
  idMappings?: IdMapping[];
}
