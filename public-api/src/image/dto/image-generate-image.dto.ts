import { IsString } from 'class-validator';

export class GenerateImageDto {
    @IsString()
    modelName: string;
}