import { IsString, MinLength, IsOptional } from 'class-validator'

export class BaseUserDto {
    @IsString()
    username: string

    age: number
}

export class CreateUserDto extends BaseUserDto {
    @MinLength(6)
    password: string
}

export class UserUpdateDto extends BaseUserDto {
    @MinLength(6)
    @IsOptional()
    password?: string

    @IsString()
    @IsOptional()
    avatar?: string
}

export class LoginDto {
    @IsString()
    username: string

    @MinLength(6)
    password: string
}
