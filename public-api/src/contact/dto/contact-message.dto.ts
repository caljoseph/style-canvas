// contact-message.dto.ts
import { IsEmail, IsString, IsNotEmpty, Length } from 'class-validator';

export class ContactMessageDto {
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    subject: string;

    @IsString()
    @IsNotEmpty()
    message: string;
}