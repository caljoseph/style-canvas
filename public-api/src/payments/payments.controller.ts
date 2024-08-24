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
    ValidationPipe, UseGuards, Put, HttpStatus
} from '@nestjs/common';
import { Response } from 'express';
import { PaymentsService } from './payments.service';
import { CreateCheckoutSessionDto } from "./dto/create-checkout-session.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";
import { AuthGuard } from "@nestjs/passport";
import { UserDecorator } from "../users/user.decorator";
import { User } from "../users/user.model";

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
    @Post('create-one-time-checkout-session')
    @UsePipes(ValidationPipe)
    async createOneTimeCheckoutSession(
        @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
        @UserDecorator() user: User,
    ): Promise<{ sessionUrl: string }> {
        const sessionUrl = await this.paymentsService.createOneTimeCheckoutSession(
            createCheckoutSessionDto.lookup_key,
            user.cognitoId);
        return { sessionUrl: sessionUrl };
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('create-subscription-checkout-session')
    @UsePipes(ValidationPipe)
    async createSubscriptionCheckoutSession(
        @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
        @UserDecorator() user: User,
    ): Promise<{ sessionUrl: string }> {
        const sessionUrl = await this.paymentsService.createSubscriptionCheckoutSession(
            createCheckoutSessionDto.lookup_key,
            user.cognitoId);
        return { sessionUrl: sessionUrl };
    }

    @UseGuards(AuthGuard('jwt'))
    @Put('update-subscription')
    @UsePipes(ValidationPipe)
    async updateSubscription(
        @Body() updateSubscriptionDto: UpdateSubscriptionDto,
        @UserDecorator() user: User,
    ): Promise<{ message: string }> {
        await this.paymentsService.updateSubscription(user.cognitoId, updateSubscriptionDto.lookup_key);
        return { message: 'Subscription updated successfully' };
    }

    @Post('cancel-subscription')
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(HttpStatus.OK)
    async cancelSubscription(@UserDecorator() user: User): Promise<{ message: string }> {
        await this.paymentsService.cancelSubscription(user.cognitoId);
        return { message: 'Subscription cancelled successfully' };
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
}