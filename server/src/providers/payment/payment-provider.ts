export interface PaymentProvider {
  initializePayment(params: {
    amount: number;
    currency: string;
    orderId: string;
    orderNumber: string;
  }): Promise<{
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
    currency: string;
  }>;
}
