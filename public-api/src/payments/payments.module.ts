import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Module({
  providers: [PaymentsService]
})
export class PaymentsModule {}


// In this module we will have all of the logic for connecting with Stripe. We will also own the payment
// log which will be a thorough record of all transactions and their associated payment, userID, date and other metadata