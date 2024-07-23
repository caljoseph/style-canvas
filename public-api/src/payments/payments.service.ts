import { Injectable } from '@nestjs/common';
import Stripe from "stripe";
import {StripeConfigService} from "../config/stripe-config.service";
import * as process from "node:process";
import {TokensService} from "../tokens/tokens.service";

@Injectable()
export class PaymentsService {
    private stripe: Stripe;
    private readonly prices: Stripe.ApiListPromise<Stripe.Price>;

    constructor(
        private config: StripeConfigService,
        private tokensService: TokensService,
        ) {
        this.stripe = config.getStripeClient();
        this.prices = this.stripe.prices.list( )
    }

    async getPrices(){
        return this.prices;
    }

    async createCheckoutSession(priceId: string, userId: string): Promise<string> {
        const session = await this.stripe.checkout.sessions.create({
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.DEV_APP_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
            // TODO: this will probably just go back to the tiers page
            cancel_url: `${process.env.DEV_APP_URL}/payments/cancel`,
            client_reference_id: userId,
            // TODO: figure out stripe tax
            // automatic_tax: {
            //     enabled: true
            // },
        });
        // TODO: consider saving the sessionId to the user??
        return session.url;
    }

    async getSessionDetails(sessionId: string): Promise<Stripe.Checkout.Session> {
        return this.stripe.checkout.sessions.retrieve(sessionId);
    }

    async handleWebhook(signature: string, payload: Buffer): Promise<void> {
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET,
            );
        } catch (err) {
            throw new Error(`Webhook Error: ${err.message}`);
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            await this.handleSuccessfulPayment(session);
        }
    }

    private async handleSuccessfulPayment(session: Stripe.Checkout.Session): Promise<void> {
        const userId = session.client_reference_id;
        const lineItems = await this.stripe.checkout.sessions.listLineItems(session.id);
        const priceId = lineItems.data[0].price.id;
        const price = await this.stripe.prices.retrieve(priceId);
        const tokenAmount = parseInt(price.metadata.tokens, 10);

        console.log(`Payment successful for user: ${userId}. Crediting ${tokenAmount} tokens.`);
        await this.tokensService.adjustTokens(userId, tokenAmount);
    }

}