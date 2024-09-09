// exceptions/invalid-model-name.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class InvalidModelNameException extends HttpException {
    constructor() {
        super('Invalid model name provided', HttpStatus.BAD_REQUEST);
    }
}