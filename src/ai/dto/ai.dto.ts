import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, ArrayNotEmpty } from 'class-validator';

export class AiChatMessageDto {
  @ApiProperty({ enum: ['system', 'user', 'assistant'] })
  @IsIn(['system', 'user', 'assistant'])
  role: 'system' | 'user' | 'assistant';

  /** 文本或多模态 content 数组（图片理解时为数组），原样透传给上游 */
  @ApiProperty({ description: '消息内容（字符串或多模态数组）' })
  content: any;
}

export class AiChatDto {
  @ApiProperty({ type: [AiChatMessageDto] })
  @IsArray()
  @ArrayNotEmpty()
  messages: AiChatMessageDto[];

  @ApiProperty({ description: '模型（不传用服务端默认）', required: false })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ description: '是否 SSE 流式返回', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}

export class AiCategorizeDto {
  @ApiProperty({ description: '记账名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ type: [String], description: '候选分类别名列表（客户端的内置+自定义 tag）' })
  @IsArray()
  @ArrayNotEmpty()
  candidates: string[];
}
