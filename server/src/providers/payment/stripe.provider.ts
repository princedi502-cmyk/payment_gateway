import { stripe } from "../../config/stripe.ts";
import type { PaymentProvider } from "./payment-provider.ts";

export class StripeProvider implements PaymentProvider {
  async initializePayment(params: {
    amount: number;
    currency: string;
    orderId: string;
    orderNumber: string;
  }) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100),
      currency: params.currency.toLowerCase(),
      metadata: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
      },
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  }
}