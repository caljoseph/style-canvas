import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import {StripeConfigModule} from "../config/stripe-config.module";
import {TokensModule} from "../tokens/tokens.module";
import {UsersModule} from "../users/users.module";

@Module({
  imports: [
      StripeConfigModule,
      TokensModule,
      UsersModule,
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController]
})
export class PaymentsModule {}

// The Payments Module handles communications with stripe. This includes one time purchases, subscription updates and their effects on user token balance.