import { HttpException, HttpStatus } from '@nestjs/common';

export class MLServerOfflineException extends HttpException {
    constructor() {
        super('ML server is currently offline or unreachable', HttpStatus.SERVICE_UNAVAILABLE);
    }
}