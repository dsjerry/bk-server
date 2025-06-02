import { Length, IsNotEmpty, ValidateIf } from 'class-validator'

export class SigninDto {
    @Length(2, 20)
    @IsNotEmpty()
    username: string;

    @Length(6, 32)
    @IsNotEmpty()
    password: string;
}

export class SignupDto extends SigninDto {
    @Length(6, 32)
    @IsNotEmpty()
    @ValidateIf((o: SignupDto) => o.password2 === o.password)
    password2: string;
}