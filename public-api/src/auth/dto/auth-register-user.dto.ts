import {IsEmail, IsNotEmpty, IsString} from 'class-validator';

export class AuthRegisterUserDto {
     // TODO: add other sign up attributes

    @IsEmail()
    email: string;

    @IsString()
    password: string;

}