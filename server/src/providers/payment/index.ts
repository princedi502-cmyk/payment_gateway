import { StripeProvider } from "./stripe.provider.ts";
import type { PaymentProvider } from "./payment-provider.ts";

const providers: Record<string, PaymentProvider> = {
  stripe: new StripeProvider(),
};

export function getPaymentProvider(gateway = "stripe"): PaymentProvider {
  const provider = providers[gateway];
  if (!provider) {
    throw new Error(`Payment provider "${gateway}" is not registered`);
  }
  return provider;
}

export function registerPaymentProvider(name: string, provider: PaymentProvider): void {
  providers[name] = provider;
}

export type { PaymentProvider } from "./payment-provider";