import { IsString, IsNumber } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { PartialType } from '@nestjs/mapped-types'
import { Keeping } from 'src/entity/keeping.entity'

export class KeepingCreateDto {
    @ApiProperty({ description: '名称' })
    @IsString()
    name: string

    @ApiProperty({ description: '交易类型' })
    @IsNumber()
    transactionType: number

    @ApiProperty({ description: '金额' })
    @IsNumber()
    amount: number

    @ApiProperty({ description: '位置' })
    @IsString()
    position: string

    @ApiProperty({ description: '图片' })
    @IsString()
    image: string

    @ApiProperty({ description: '备注' })
    @IsString()
    remark: string

    @ApiProperty({ description: '本地id' })
    @IsString()
    localId: string
}

export class KeepingUpdateDto extends PartialType(KeepingCreateDto) {
    @ApiProperty({ description: 'id' })
    id: number

    @ApiProperty({ description: '更新时间' })
    updateTime: Date
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
    @ApiProperty({ type: [Keeping] })
    items: Keeping[];

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

export enum ConflictType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete'
}

export class ConflictItem {
    @ApiProperty({ enum: ConflictType })
    type: ConflictType;

    @ApiProperty({ description: '客户端版本数据' })
    clientVersion: any;

    @ApiProperty({ description: '服务端版本数据' })
    serverVersion: any;

    @ApiProperty({ description: '冲突发生时间' })
    conflictSince: string;
}

export class ConflictResolution {
    @ApiProperty({ enum: ConflictType, description: '冲突类型' })
    type: ConflictType;

    @ApiProperty({ description: '解决后的数据' })
    resolvedData: any;

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

    @ApiProperty({ type: KeepingBatchDto })
    serverChanges: KeepingBatchDto;

    @ApiProperty({ type: [IdMapping], description: '本地ID与服务端ID的映射关系' })
    idMappings?: IdMapping[];
}
