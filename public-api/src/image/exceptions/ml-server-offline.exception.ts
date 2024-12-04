import { HttpException, HttpStatus } from '@nestjs/common';

export class MLServerOfflineException extends HttpException {
    constructor(message?: string) {
        if (typeof message !== 'undefined') {
            super(message, HttpStatus.SERVICE_UNAVAILABLE);

        } else {
            super('ML server is currently offline or unreachable', HttpStatus.SERVICE_UNAVAILABLE);

        }
    }
}