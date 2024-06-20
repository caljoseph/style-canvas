import {IsEmail, IsString} from 'class-validator';

export class AuthLoginUserDto {
    @IsEmail()
    email: string;

    @IsString()
    password: string;
}