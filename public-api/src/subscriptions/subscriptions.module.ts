import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  providers: [SubscriptionsService]
})
export class SubscriptionsModule {}

// The subscriptions module will handle subscriptions and will delegate the payment and logging of the transaction type to the payment services
// We will probably have our own table in here that will relate subscription IDs with user IDs
// We must integrate with AWS services that will help schedule the payments and token update and gracefully adjust the user's subscription status in response to those payments
// We will also have all of the logic for creating, modifying and deleting subscriptions. We will also be responsible for telling other services
// Such as the payments service or the token manager what to do in response to these changes.