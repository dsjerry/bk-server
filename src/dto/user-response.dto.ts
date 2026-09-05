import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/entity/user.entity';

/**
 * 用户响应 DTO —— 出参专用，与 Entity 解耦。
 * 之前 `GET /user` 直接返回 User 实体（password 哈希泄露），
 * `@Exclude()` 又因没有注册 ClassSerializerInterceptor 而形同虚设；
 * 现在统一由 toUserResponse 白名单式映射，敏感字段永远出不了 Service 层。
 */
export class UserResponseDto {
  @ApiProperty({ description: '用户ID' })
  id: number;

  @ApiProperty({ description: '用户名' })
  username: string;

  @ApiProperty({ description: '年龄' })
  age: number;

  @ApiProperty({ description: '是否激活' })
  isActive: boolean;

  @ApiProperty({ description: '创建时间' })
  createTime: Date;

  @ApiProperty({ description: '头像地址', required: false })
  avatar?: string;
}

export function toUserResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    username: user.username,
    age: user.age,
    isActive: user.isActive,
    createTime: user.createTime,
    avatar: user.avatar,
  };
}
