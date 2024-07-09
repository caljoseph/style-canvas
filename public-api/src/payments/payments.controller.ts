import {
    Controller,
    Post,
    Body,
    Req,
    Headers,
    HttpCode,
    Get,
    Query,
    Res,
    UsePipes,
    ValidationPipe, UseGuards
} from '@nestjs/common';
import { Response } from 'express';
import { PaymentsService } from './payments.service';
import {CreateCheckoutSessionDto} from "./dto/create-checkout-session.dto";
import {AuthGuard} from "@nestjs/passport";
import {UserDecorator} from "../users/user.decorator";
import {User} from "../users/user.model";

@Controller('payments')
export class PaymentsController {
    constructor(
        private paymentsService: PaymentsService,
    ) {}

    @Get('prices')
    async getPrices(){
        return this.paymentsService.getPrices();
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('create-checkout-session')
    @UsePipes(ValidationPipe)
    async createCheckoutSession(
        @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
        @UserDecorator() user: User,
    ): Promise<{ sessionUrl: string }> {
        const sessionUrl = await this.paymentsService.createCheckoutSession(
            createCheckoutSessionDto.priceId,
            user.cognitoId);
        return { sessionUrl: sessionUrl };
    }

    @Post('webhook')
    @HttpCode(200)
    async handleWebhook(
        @Headers('stripe-signature') signature: string,
        @Req() req: Request & { rawBody?: Buffer }
    ): Promise<string> {
        try {
            await this.paymentsService.handleWebhook(signature, req.rawBody);
            return 'Webhook processed successfully';
        } catch (error) {
            console.error('Webhook processing error:', error);
            throw error;
        }
    }

    @Get('success')
    async handleSuccess(@Query('session_id') sessionId: string, @Res() res: Response) {
        try {
            const session = await this.paymentsService.getSessionDetails(sessionId);

            if (session.payment_status === 'paid') {
                res.send('Payment successful! Your tokens will be added to your account shortly.');
            } else {
                res.send('Payment not completed. Please try again.');
            }
        } catch (error) {
            console.error('Error retrieving session:', error);
            res.status(400).send('Unable to verify payment status. Please contact support.');
        }
    }

    @Get('cancel')
    handleCancel(@Res() res: Response) {
        // TODO: figure out what this means
        res.send('Payment cancelled. You can try again when your ready.');
    }
}