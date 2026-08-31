import { type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import Order from "../models/order.model.ts";
import Product from "../models/product.model.ts";

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { items, shippingAddress, contactInfo } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: "Items are required",
      });
      return;
    }

    const productIds = items.map((item: any) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
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

    const orderData = {
      items: orderItems,
      shippingAddress,
      contactInfo,
      subtotal,
      tax,
      total,
      userId: new mongoose.Types.ObjectId(userId),
    };

    const order = new Order(orderData);
    await order.save();

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const userId = (req as any).userId;

    const order = await Order.findById(orderId);

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    if (order.userId && order.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to view this order",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const skip = (page - 1) * limit;

    const orders = await Order.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
    });

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};
