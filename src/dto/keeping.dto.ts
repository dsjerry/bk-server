import { IsString, IsNumber } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { PartialType } from '@nestjs/mapped-types'

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
}

export class KeepingUpdateDto extends PartialType(KeepingCreateDto) {
    @ApiProperty({ description: 'id' })
    id: number
}