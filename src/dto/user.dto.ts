import { IsString, MinLength } from 'class-validator'

export class CreateUserDto {
    @IsString()
    username: string

    age: number

    @MinLength(6)
    password: string
}

export class LoginDto {
    @IsString()
    username: string

    @MinLength(6)
    password: string
}
