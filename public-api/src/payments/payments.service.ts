import {BadRequestException, Injectable, InternalServerErrorException, Logger} from '@nestjs/common';
import Stripe from "stripe";
import {StripeConfigService} from "../config/stripe-config.service";
import * as process from "node:process";
import {TokensService} from "../tokens/tokens.service";
import {UserRepository} from "../users/user.repository";

@Injectable()
export class PaymentsService {
    private stripe: Stripe;
    private readonly prices: Stripe.ApiListPromise<Stripe.Price>;
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        private config: StripeConfigService,
        private tokensService: TokensService,
        private userRepository: UserRepository,
        ) {
        this.stripe = config.getStripeClient();
        this.prices = this.stripe.prices.list( )
    }

    async getPrices(){
        return this.prices;
    }

    async createOneTimeCheckoutSession(lookup_key: string, userId: string): Promise<string> {
        const prices = await this.stripe.prices.list({
            lookup_keys: [lookup_key],
            expand: ['data.product'],
        });

        const session = await this.stripe.checkout.sessions.create({
            billing_address_collection: 'auto',
            line_items: [
                {
                    price: prices.data[0].id,
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.DEV_APP_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
            // TODO: this will probably just go back to the tiers page
            cancel_url: `${process.env.DEV_APP_URL}/payments/cancel`,
            client_reference_id: userId,
            // TODO: figure out stripe tax
            automatic_tax: {
                enabled: true
            },
        });
        return session.url;
    }

    async createSubscriptionCheckoutSession(lookup_key: string, userId: string) {
        // I don't want a user to be able to create a checkout session for a subscription they currently have
        const user = await this.userRepository.getOne(userId)
        const currentPlan = user.subscriptionType
        if (lookup_key === currentPlan) {
            this.logger.log(`Not creating checkout session because user: ${userId} already has this subscription: ${currentPlan}`);
            throw new BadRequestException('You already have this subscription');
        }

        const prices = await this.stripe.prices.list({
            lookup_keys: [lookup_key],
            expand: ['data.product'],
        });




        const session = await this.stripe.checkout.sessions.create({
            billing_address_collection: 'auto',
            line_items: [
                {
                    price: prices.data[0].id,
                    quantity: 1,

                },
            ],
            mode: 'subscription',
            success_url: `${process.env.DEV_APP_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
            // TODO: this will probably just go back to the tiers page
            cancel_url: `${process.env.DEV_APP_URL}/payments/cancel`,
            subscription_data: {
                metadata: {
                    userId: userId
                }
            },
            automatic_tax: {
                enabled: true
            },
        });
        return session.url;
    }

    async updateSubscription(userId: string, newLookupKey: string): Promise<void> {
        const user = await this.userRepository.getOne(userId);

        if (!user.subscriptionType) {
            throw new BadRequestException('User does not have an active subscription');
        }

        if (user.subscriptionType === newLookupKey) {
            throw new BadRequestException('User already has this subscription');
        }

        try {
            // Fetch all subscriptions and filter by metadata
            const subscriptions = await this.stripe.subscriptions.list({
                status: 'active',
                expand: ['data.customer'],
            });

            const userSubscription = subscriptions.data.find(sub => sub.metadata.userId === userId);

            if (!userSubscription) {
                throw new BadRequestException('No active subscription found for the user');
            }

            // Fetch the new price
            const prices = await this.stripe.prices.list({
                lookup_keys: [newLookupKey],
                expand: ['data.product'],
            });

            if (prices.data.length === 0) {
                throw new BadRequestException('Invalid subscription type');
            }

            const newPrice = prices.data[0];

            // Update the subscription in Stripe
            await this.stripe.subscriptions.update(userSubscription.id, {
                items: [{
                    id: userSubscription.items.data[0].id,
                    price: newPrice.id,
                }],
                proration_behavior: 'none', // No prorating
            });

            // Update our database
            await this.userRepository.updateSubscription(userId, newLookupKey);

            this.logger.log(`Updated subscription for user ${userId} to ${newLookupKey}`);
        } catch (error) {
            this.logger.error(`Failed to update subscription for user ${userId}: ${error.message}`);
            if (error instanceof Stripe.errors.StripeError) {
                throw new BadRequestException(`Stripe error: ${error.message}`);
            }
            throw new BadRequestException('Failed to update subscription');
        }
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

        switch (event.type) {
            // Logic for one time is simple
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.mode === "subscription") {
                    // as far as I can tell I don't need to do anything for a checkout session for a subscription
                    break;
                }
                await this.handleSuccessfulOneTimePayment(session);
                break;

            // Below is all the logic for subscriptions
            case 'customer.subscription.created':
                // Since invoice.paid will already handle tokens the only purpose of this webhook in our case is to set the initial type of subscription for a user.
                this.logger.log(`Received webhook event type ${event.type}.`);
                await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
                break;
            case 'customer.subscription.deleted':
                // This is sent when a subscription actually ends
                this.logger.log(`Received webhook event type ${event.type}.`);
                await this.handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
                break;
            case 'invoice.paid':
                // This is the big dog that should credit my user some tokens
                this.logger.log(`Received webhook event type ${event.type}.`);
                await this.handleSuccessfulSubscriptionPayment(event.data.object as Stripe.Invoice);
                break;
            case 'invoice.payment_failed':
                this.logger.log(`Received webhook event type ${event.type}.`);
                await this.handleFailedPayment(event.data.object as Stripe.Invoice);
                break;
            default:
                // this.logger.log(`Unhandled webhook event type ${event.type}.`);
                break;
        }

    }

    private async handleSuccessfulOneTimePayment(session: Stripe.Checkout.Session): Promise<void> {
        const userId = session.client_reference_id;
        const lineItems = await this.stripe.checkout.sessions.listLineItems(session.id);
        const priceId = lineItems.data[0].price.id;
        const price = await this.stripe.prices.retrieve(priceId);
        const tokenAmount = parseInt(price.metadata.tokens, 10);

        this.logger.log(`One time payment successful for user: ${userId}. Crediting ${tokenAmount} tokens.`);
        await this.tokensService.adjustTokens(userId, tokenAmount);
    }

    private async handleSuccessfulSubscriptionPayment(invoice: Stripe.Invoice): Promise<void> {
        if (invoice.subscription) {
            const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription as string);

            // all my custom values are undefined in the subscription
            const userId = subscription.metadata.userId;

            if (!userId) {
                this.logger.warn(`User ID not found in metadata for subscription ${subscription.id}`);
                return;
            }

            const priceId = subscription.items.data[0].price.id;
            const price = await this.stripe.prices.retrieve(priceId);
            const product = await this.stripe.products.retrieve(price.product as string);

            const tokenAmount = parseInt(product.metadata.tokens, 10);

            if (isNaN(tokenAmount)) {
                this.logger.warn(`Invalid token amount in product metadata for price ID: ${priceId}`);
                return;
            }

            await this.tokensService.adjustTokens(userId, tokenAmount);
            this.logger.log(`Credited ${tokenAmount} tokens to user ${userId} for invoice ${invoice.id}`);
        } else {
            this.logger.log(`Paid invoice ${invoice.id} is not associated with a subscription`);
        }
    }

    private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
        const userId = subscription.metadata.userId;
        if (!userId) {
            this.logger.warn(`User ID not found in metadata for subscription ${subscription.id}`);
            return;
        }

        const product = await this.stripe.products.retrieve(subscription.items.data[0].price.product as string);
        const subscriptionType = product.metadata.subscription_type;

        await this.userRepository.updateSubscription(userId, subscriptionType);
        this.logger.log(`Updated subscription for user ${userId} to ${subscriptionType}`);
    }

    private async handleSubscriptionCancelled(subscription: Stripe.Subscription): Promise<void> {
        const userId = subscription.metadata.userId;
        if (!userId) {
            this.logger.warn(`User ID not found in metadata for cancelled subscription ${subscription.id}`);
            return;
        }

        await this.userRepository.removeSubscription(userId);
        this.logger.log(`Removed subscription for user ${userId}`);
    }

    private async handleFailedPayment(invoice: Stripe.Invoice): Promise<void> {
        if (!invoice.subscription) {
            this.logger.warn(`Failed invoice ${invoice.id} is not associated with a subscription`);
            return;
        }

        const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription as string);
        const userId = subscription.metadata.userId;
        if (!userId) {
            this.logger.warn(`User ID not found in metadata for subscription ${subscription.id}`);
            return;
        }

        this.logger.warn(`Payment failed for user ${userId}`);
        // TODO:

        // 1) notify the user somehow that their payment bounced
        // 2) delete their subscription in Stripe, probably just with cancelSubscription()
        // 3) set their subscriptionType to none

    }

    // This method would be called by the front end to cancel a subscription
    async cancelSubscription(userId: string): Promise<void> {
        this.logger.log(`Attempting to cancel subscription for user ${userId}`);

        try {
            const user = await this.userRepository.getOne(userId);

            if (!user.subscriptionType) {
                throw new BadRequestException('User does not have an active subscription');
            }

            // Fetch all subscriptions and filter by metadata
            const subscriptions = await this.stripe.subscriptions.list({
                status: 'active',
                expand: ['data.customer'],
            });

            const userSubscription = subscriptions.data.find(sub => sub.metadata.userId === userId);

            if (!userSubscription) {
                throw new BadRequestException('No active subscription found for the user');
            }

            // Cancel the subscription in Stripe
            const canceledSubscription = await this.stripe.subscriptions.update(userSubscription.id, {
                cancel_at_period_end: true
            });

            this.logger.log(`Stripe subscription ${canceledSubscription.id} cancelled for user ${userId}`);

            // If Stripe cancellation was successful, update the database
            await this.userRepository.removeSubscription(userId);

            this.logger.log(`Database updated: Subscription removed for user ${userId}`);
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error; // Re-throw BadRequestException
            }
            if (error instanceof Stripe.errors.StripeError) {
                this.logger.error(`Stripe error while cancelling subscription for user ${userId}: ${error.message}`);
                throw new InternalServerErrorException(`Failed to cancel subscription: ${error.message}`);
            }
            this.logger.error(`Unexpected error while cancelling subscription for user ${userId}: ${error.message}`);
            throw new InternalServerErrorException('An unexpected error occurred while cancelling the subscription');
        }
    }}