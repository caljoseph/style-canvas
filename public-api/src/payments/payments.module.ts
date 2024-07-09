import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import {StripeConfigModule} from "../config/stripe-config.module";
import {TokensModule} from "../tokens/tokens.module";

@Module({
  imports: [
      StripeConfigModule,
      TokensModule,
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController]
})
export class PaymentsModule {}


// In this module we will have all of the logic for connecting with Stripe. We will also own the payment
// log which will be a thorough record of all transactions and their associated payment, userID, date and other metadata