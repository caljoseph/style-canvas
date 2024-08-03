import {IsString, } from 'class-validator';

export class CreateCheckoutSessionDto {
    @IsString()
    lookup_key: string;
}