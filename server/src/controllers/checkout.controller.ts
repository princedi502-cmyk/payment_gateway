import { type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import Product from "../models/product.model.ts";
import Order from "../models/order.model.ts";
import User from "../models/user.model.ts";
import { getPaymentProvider } from "../providers/payment";

export const createCheckoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { items, shippingAddress, contactInfo, selectedAddressId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: "Items are required",
      });
      return;
    }

    if (!shippingAddress || typeof shippingAddress !== "object") {
      res.status(400).json({
        success: false,
        message: "Shipping address is required",
      });
      return;
    }

    const { fullName, email, phone, address, city, state, zipCode } = shippingAddress;

    const productIds = items.map((item: any) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        res.status(400).json({
          success: false,
          message: "Each item must have a valid productId and quantity >= 1",
        });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        res.status(400).json({
          success: false,
          message: `Invalid product ID: ${item.productId}`,
        });
        return;
      }

      const product = productMap.get(item.productId);

      if (!product) {
        res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`,
        });
        return;
      }

      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        productId: item.productId,
        title: product.title,
        price: product.price,
        quantity: item.quantity,
        image: product.image,
      });
    }

    const tax = parseFloat((subtotal * 0.08).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    const orderData: any = {
      items: orderItems,
      shippingAddress: { fullName, email, phone, address, city, state, zipCode },
      subtotal,
      tax,
      total,
      status: "pending",
      userId: (req as any).userId ? new mongoose.Types.ObjectId((req as any).userId) : undefined,
    };

    if (contactInfo) {
      orderData.contactInfo = contactInfo;
    }

    const order = new Order(orderData);

    await order.save();

    let paymentIntent;
    try {
      paymentIntent = await getPaymentProvider().initializePayment({
        amount: total,
        currency: "usd",
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
      });
    } catch (paymentError) {
      await Order.findByIdAndDelete(order._id);
      throw paymentError;
    }

    order.paymentIntentId = paymentIntent.paymentIntentId;
    await order.save();

    const userId = (req as any).userId

    if (userId && selectedAddressId) {
      const user = await User.findById(userId)
      if (user) {
        user.addresses.forEach((a: typeof user.addresses[number]) => {
          a.isDefault = a._id?.toString() === selectedAddressId
        })
        await user.save()
      }
    }

    res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        clientSecret: paymentIntent.clientSecret,
      },
    });
  } catch (error) {
    next(error);
  }
};
