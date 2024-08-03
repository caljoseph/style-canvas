import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateSubscriptionDto {
    @IsString()
    @IsNotEmpty()
    lookup_key: string;
}