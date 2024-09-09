// exceptions/internal-server-error.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class InternalMLServerErrorException extends HttpException {
    constructor() {
        super('An internal server error occurred', HttpStatus.INTERNAL_SERVER_ERROR);
    }
}