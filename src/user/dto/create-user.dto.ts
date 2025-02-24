import { IsString, MinLength } from 'class-validator'

export class CreateUserDto {
    @IsString()
    name: string
    
    age: number

    @MinLength(6)
    passwd: string
}