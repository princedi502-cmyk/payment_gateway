import { type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import Order from "../models/order.model.ts";
import Product from "../models/product.model.ts";
import { BadRequestError, NotFoundError, ForbiddenError } from "../errors/AppError.ts";

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { items, shippingAddress, contactInfo } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestError("Items are required");
    }

    const productIds = items.map((item: any) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundError(`Product`);
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
    const { orderId } = req.params as { orderId: string };
    const userId = (req as any).userId;
    const guestToken = Array.isArray(req.query.guestToken) ? req.query.guestToken[0] : req.query.guestToken;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new BadRequestError("Invalid order ID");
    }

    const order = await Order.findById(orderId);

    if (!order) {
      throw new NotFoundError("Order");
    }

    if (order.userId) {
      if (order.userId.toString() !== userId) {
        throw new ForbiddenError("You do not have permission to view this order");
      }
    } else {
      if (!guestToken || guestToken !== order.guestToken) {
        throw new ForbiddenError("Guest token required to view this order");
      }
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

export const getUserStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId;

    const stats = await Order.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: "paid",
        },
      },
      {
        $group: {
          _id: null,
          totalPaidOrders: { $sum: 1 },
          totalPaidSpent: { $sum: "$total" },
        },
      },
    ]);

    const result = stats[0] || { totalPaidOrders: 0, totalPaidSpent: 0 };

    res.status(200).json({
      success: true,
      data: {
        totalPaidOrders: result.totalPaidOrders,
        totalPaidSpent: result.totalPaidSpent,
      },
    });
  } catch (error) {
    next(error);
  }
};