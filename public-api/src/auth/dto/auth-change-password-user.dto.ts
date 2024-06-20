import {IsEmail, IsNotEmpty, IsString, Matches} from 'class-validator';

export class AuthChangePasswordUserDto {
    // TODO: possibly figure out regex for the passwords
    @IsEmail()
    email: string;

    @IsNotEmpty()
    currentPassword: string;

    @IsString()
    newPassword: string;
}