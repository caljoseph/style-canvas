import {Injectable} from "@nestjs/common";
import Stripe from "stripe";

@Injectable()
export class StripeConfigService {
    public getStripeClient() {
        return new Stripe(process.env.LIVE_STRIPE_SECRET_KEY)
    }
}