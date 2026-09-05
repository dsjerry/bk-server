import { IsString, MinLength, IsOptional, IsNumber } from 'class-validator';

export class BaseUserDto {
  @IsString()
  username: string;

  @IsNumber()
  age: number;
}

export class CreateUserDto extends BaseUserDto {
  @MinLength(6)
  password: string;
}

/**
 * PATCH /user/:id 的入参：全部可选（只传要改的字段）。
 * 旧版继承 BaseUserDto 导致 username/age 必填，单独改密码/头像会被校验拦下
 */
export class UserUpdateDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsNumber()
  @IsOptional()
  age?: number;

  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}

export class LoginDto {
  @IsString()
  username: string;

  @MinLength(6)
  password: string;
}
