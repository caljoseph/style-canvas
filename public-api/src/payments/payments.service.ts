import {BadRequestException, Injectable, InternalServerErrorException, Logger} from '@nestjs/common';
import Stripe from "stripe";
import {StripeConfigService} from "../config/stripe-config.service";
import * as process from "node:process";
import {TokensService} from "../tokens/tokens.service";
import {UserRepository} from "../users/user.repository";
import { ConfigService } from '@nestjs/config';


@Injectable()
export class PaymentsService {
    private stripe: Stripe;
    private readonly prices: Stripe.ApiListPromise<Stripe.Price>;
    private readonly logger = new Logger(PaymentsService.name);
    private readonly appUrl: string;

    constructor(
        private config: StripeConfigService,
        private configService: ConfigService,
        private tokensService: TokensService,
        private userRepository: UserRepository,
        ) {
        this.stripe = config.getStripeClient();
        this.prices = this.stripe.prices.list( )
        this.appUrl = this.configService.get<string>('APP_URL');
    }

    async getPrices(){
        return this.prices;
    }

    async createOneTimeCheckoutSession(lookup_key: string, userId: string): Promise<string> {
        // Get the prices from the lookup key
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
            success_url: `${this.appUrl}/pricing?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${this.appUrl}/pricing?payment=cancelled`,
            client_reference_id: userId,
            // TODO: figure out stripe tax
            automatic_tax: {
                enabled: true
            },
        });
        return session.url;
    }

    async createSubscriptionCheckoutSession(lookup_key: string, userId: string) {
        // TODO: you probably shouldn't be able to do this if you have subscription.
        // When i demoed this for brandon it didn't add the subscription type to the database
        // I don't want a user to be able to create a checkout session for a subscription they currently have
        const user = await this.userRepository.getOne(userId)
        const currentPlan = user.subscriptionType
        if (currentPlan !== "none") {
            this.logger.log(`Not creating checkout session because user: ${userId} already has subscription: ${currentPlan}`);
            throw new BadRequestException('You already have a subscription. You must update it or cancel it and buy another.');
        }

        // Get the prices from the lookup key
        const prices = await this.stripe.prices.list({
            lookup_keys: [lookup_key],
            expand: ['data.product'],
        });

        // Create a checkout session
        const session = await this.stripe.checkout.sessions.create({
            billing_address_collection: 'auto',
            line_items: [
                {
                    price: prices.data[0].id,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${this.appUrl}/pricing?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${this.appUrl}/pricing?payment=cancelled`,
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
            // ONE TIME PURCHASES
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.mode === "subscription") {
                    // Adding tokens for a subscription is handled by invoice.paid
                    break;
                }
                await this.handleSuccessfulOneTimePayment(session);
                break;

            // SUBSCRIPTIONS
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
                // This is the work horse that gives users tokens when they pay their subscription
                this.logger.log(`Received webhook event type ${event.type}.`);
                await this.handleSuccessfulSubscriptionPayment(event.data.object as Stripe.Invoice);
                break;
            case 'invoice.payment_failed':
                // This is when a user's payment is delinquent
                this.logger.log(`Received webhook event type ${event.type}.`);
                await this.handleFailedPayment(event.data.object as Stripe.Invoice);
                break;
            default:
                // We get a ton more webhook events than these so we just ignore them
                break;
        }

    }

    /**
     * Handles a successful one-time payment.
     *
     * This method:
     * 1. Retrieves the line items and price details from the Stripe session.
     * 2. Extracts the token amount from the price metadata.
     * 3. Credits the user's account with the purchased tokens.
     *
     * @param session - The Stripe Checkout Session object.
     * @returns A Promise that resolves when the tokens have been credited to the user.
     * @private
     */
    private async handleSuccessfulOneTimePayment(session: Stripe.Checkout.Session): Promise<void> {
        const userId = session.client_reference_id;
        const lineItems = await this.stripe.checkout.sessions.listLineItems(session.id);
        const priceId = lineItems.data[0].price.id;
        const price = await this.stripe.prices.retrieve(priceId);
        const tokenAmount = parseInt(price.metadata.tokens, 10);

        this.logger.log(`One time payment successful for user: ${userId}. Crediting ${tokenAmount} tokens.`);
        await this.tokensService.adjustTokens(userId, tokenAmount);
    }

    /**
     * Handles a successful subscription payment.
     *
     * This method:
     * 1. Retrieves the subscription details from the invoice.
     * 2. Extracts the user ID and token amount from the subscription and product metadata.
     * 3. Credits the user's account with the subscription's token amount.
     *
     * @param invoice - The Stripe Invoice object.
     * @returns A Promise that resolves when the tokens have been credited to the user.
     * @private
     */
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

    /**
     * Handles the creation of a new subscription.
     *
     * This method:
     * 1. Extracts the user ID from the subscription metadata.
     * 2. Retrieves the subscription type from the associated product's metadata.
     * 3. Updates the user's subscription type in the database.
     *
     * @param subscription - The Stripe Subscription object.
     * @returns A Promise that resolves when the user's subscription has been updated.
     * @private
     */
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

    /**
     * Handles the cancellation of a subscription.
     *
     * This method:
     * 1. Extracts the user ID from the subscription metadata.
     * 2. Removes the subscription from the user's record in the local database.
     *
     * @param subscription - The Stripe Subscription object.
     * @returns A Promise that resolves when the user's subscription has been removed.
     * @private
     */
    private async handleSubscriptionCancelled(subscription: Stripe.Subscription): Promise<void> {
        const userId = subscription.metadata.userId;
        if (!userId) {
            this.logger.warn(`User ID not found in metadata for cancelled subscription ${subscription.id}`);
            return;
        }

        await this.userRepository.removeSubscription(userId);
        this.logger.log(`Removed subscription for user ${userId}`);
    }

    /**
     * Handles a failed payment for a subscription.
     *
     * This method is triggered when a payment for a subscription invoice fails. It performs the following steps:
     * 1. Verifies that the failed invoice is associated with a subscription.
     * 2. Retrieves the subscription details and associated user ID.
     * 3. Immediately cancels the subscription in Stripe.
     * 4. Removes the subscription from the local database.
     *
     * Note: This method does not currently notify the user of the failed payment and subscription cancellation.
     * A notification system should be implemented as a future enhancement.
     *
     * @param invoice - The Stripe Invoice object representing the failed payment.
     * @throws InternalServerErrorException if an error occurs while processing the payment failure.
     * @returns A Promise that resolves when the failed payment has been handled and the subscription cancelled.
     * @private
     */
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
        try {
            // Cancel the subscription in Stripe
            await this.stripe.subscriptions.cancel(subscription.id)
            this.logger.log(`Cancelled Stripe subscription ${subscription.id} for user ${userId} due to payment failure`);

            // Update user's subscription status in the database
            await this.userRepository.removeSubscription(userId);
            this.logger.log(`Removed subscription for user ${userId} in the database`);

        } catch (error) {
            this.logger.error(`Error handling failed payment for user ${userId}: ${error.message}`);
            throw new InternalServerErrorException('Failed to process payment failure');
        }

        // TODO: Notify the user that their payment bounced when I have a notification plan
    }

    /**
     * Updates a user's subscription to a new plan.
     *
     * This method performs the following steps:
     * 1. Verifies the user has an active subscription different from the new one.
     * 2. Retrieves the user's current Stripe subscription.
     * 3. Fetches the new price information from Stripe.
     * 4. Updates the subscription in Stripe to the new price.
     * 5. Updates the subscription type in the local database.
     *
     * @param userId - The ID of the user whose subscription is being updated.
     * @param newLookupKey - The lookup key for the new subscription plan.
     * @throws BadRequestException if:
     *   - The user doesn't have an active subscription
     *   - The user already has the requested subscription
     *   - No active Stripe subscription is found for the user
     *   - The new subscription type is invalid
     *   - Any Stripe-related error occurs
     * @returns A Promise that resolves when the subscription has been successfully updated.
     */
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
                proration_behavior: 'none', // We don't prorate because the subscription is a once a month deposit of tokens
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

    /**
     * Cancels a user's subscription at the end of the current billing period.
     *
     * This method performs the following steps:
     * 1. Verifies that the user has an active subscription.
     * 2. Retrieves the user's active Stripe subscription.
     * 3. Updates the Stripe subscription to cancel at the end of the current period.
     * 4. Removes the subscription from the database.
     *
     * @param userId - The ID of the user whose subscription is to be cancelled.
     * @throws BadRequestException if:
     *   - The user doesn't have an active subscription
     *   - No active Stripe subscription is found for the user
     * @throws InternalServerErrorException if:
     *   - A Stripe API error occurs
     *   - Any other unexpected error occurs during the cancellation process
     * @returns A Promise that resolves when the subscription has been successfully cancelled.
     */
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