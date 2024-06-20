import {IsEmail, IsNotEmpty, Matches} from 'class-validator';

export class AuthLoginUserDto {
    @IsEmail()
    email: string;

    @IsNotEmpty()
    password: string;
}