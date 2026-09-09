import { stripe } from "../config/stripe.js";
import Order from "../models/order.model.js";
import Return from "../models/return.model.js";

export async function processReturnRefund(returnId: string, orderId: string, amount?: number): Promise<string> {
  const returnDoc = await Return.findById(returnId).populate("orderId userId");
  if (!returnDoc) {
    throw new Error("Return not found");
  }

  if (returnDoc.status === "refunded") {
    throw new Error("Return has already been refunded");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  const refundAmount = amount ?? order.total;

  const refund = await stripe.refunds.create(
    {
      payment_intent: order.paymentIntentId!,
      amount: Math.round(refundAmount * 100),
    },
    {
      idempotencyKey: `refund-${returnId}`,
    },
  );

  returnDoc.status = "refunded";
  returnDoc.refundAmount = refundAmount;
  returnDoc.refundPaymentIntentId = refund.id;
  returnDoc.refundedAt = new Date();
  await returnDoc.save();

  order.status = "refunded";
  await order.save();

  return refund.id;
}
