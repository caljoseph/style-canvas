import {IsEmail, IsNotEmpty} from 'class-validator';

export class AuthRegisterUserDto {
     // TODO: add other sign up attributes

    @IsEmail()
    email: string;

    @IsNotEmpty()
    password: string;

}