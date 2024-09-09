import { HttpException, HttpStatus } from '@nestjs/common';

export class NetworkError extends HttpException {
    constructor(message: string = 'The ML server could not be reached. Please check your network connection or try again later.') {
        super(message, HttpStatus.SERVICE_UNAVAILABLE);
    }
}