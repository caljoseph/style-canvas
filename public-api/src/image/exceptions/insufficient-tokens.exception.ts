// exceptions/insufficient-tokens.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientTokensException extends HttpException {
    constructor() {
        super('User has no tokens left', HttpStatus.PAYMENT_REQUIRED);
    }
}