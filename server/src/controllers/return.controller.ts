import { type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import Order, { type IOrder } from "../models/order.model.js";
import Return from "../models/return.model.js";
import { generateReturnImageFilename, validateMagicBytes } from "../config/multer.js";
import { processReturnRefund } from "../services/refund.service.js";
import { OneSignalService } from "../services/onesignal.service.js";

const RETURN_WINDOW_DAYS = 15;

let oneSignalService: OneSignalService | null = null;
function getOneSignalService(): OneSignalService | null {
  if (!oneSignalService) {
    try {
      oneSignalService = new OneSignalService();
    } catch {
      oneSignalService = null;
    }
  }
  return oneSignalService;
}

async function sendNotification(
  userId: string,
  title: string,
  message: string,
): Promise<void> {
  const service = getOneSignalService();
  if (!service) {
    console.warn("OneSignal service not configured; skipping notification");
    return;
  }
  try {
    await service.sendPushToExternalId({
      externalUserId: userId,
      title,
      message,
    });
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
}

function getOrderNumber(order: IOrder): string {
  return order.orderNumber || "#N/A";
}

export const createReturnRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { orderId, reason, description } = req.body;
    const userId = (req as any).userId;

    if (!orderId) {
      res.status(400).json({ success: false, message: "orderId is required" });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      res.status(400).json({ success: false, message: "Invalid orderId" });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    if (order.userId && order.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to create a return for this order",
      });
      return;
    }

    if (order.status !== "paid") {
      res.status(403).json({
        success: false,
        message: "Only paid orders are eligible for returns",
      });
      return;
    }

    if (order.returnRequested) {
      res.status(409).json({
        success: false,
        message: "A return request already exists for this order",
      });
      return;
    }

    if (!order.paidAt) {
      res.status(400).json({
        success: false,
        message: "Order has no paidAt date; cannot determine return eligibility",
      });
      return;
    }

    const windowDeadline = new Date(order.paidAt.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    if (windowDeadline < new Date()) {
      res.status(403).json({
        success: false,
        message: `Return window of ${RETURN_WINDOW_DAYS} days from paidAt has expired`,
      });
      return;
    }

    const existingReturn = await Return.findOne({ orderId: order._id });
    if (existingReturn) {
      res.status(409).json({
        success: false,
        message: "A return request already exists for this order",
      });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: "Image is required" });
      return;
    }

    if (!order.userId) {
      res.status(400).json({
        success: false,
        message: "Order has no associated user",
      });
      return;
    }

    const detectedExt = validateMagicBytes(file.buffer);
    if (!detectedExt) {
      res.status(400).json({ success: false, message: "File content does not match a supported image type" });
      return;
    }

    const filename = generateReturnImageFilename(file.originalname, detectedExt);
    const uploadDir = path.join(process.cwd(), "uploads", "returns");
    const filepath = path.join(uploadDir, filename);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(filepath, file.buffer);

    const relativePath = `returns/${filename}`;

    const returnDoc = await Return.create({
      orderId: order._id,
      userId: order.userId,
      reason,
      description,
      image: relativePath,
      status: "requested",
      requestedAt: new Date(),
    });

    order.returnRequested = true;
    await order.save();

    await sendNotification(
      order.userId!.toString(),
      "Return Request Received",
      `Your return request for order ${getOrderNumber(order)} has been received. We will review it within 24 hours.`,
    );

    res.status(201).json({
      success: true,
      data: returnDoc,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllReturns = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const returns = await Return.find()
      .populate("orderId")
      .populate("userId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: returns.length,
      data: returns,
    });
  } catch (error) {
    next(error);
  }
};

export const getReturnById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid return ID" });
      return;
    }

    const returnDoc = await Return.findById(id).populate("orderId userId");
    if (!returnDoc) {
      res.status(404).json({ success: false, message: "Return not found" });
      return;
    }

    res.status(200).json({ success: true, data: returnDoc });
  } catch (error) {
    next(error);
  }
};

export const approveReturn = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid return ID" });
      return;
    }

    const returnDoc = await Return.findById(id).populate("orderId userId");
    if (!returnDoc) {
      res.status(404).json({ success: false, message: "Return not found" });
      return;
    }

    if (returnDoc.status !== "requested") {
      res.status(400).json({
        success: false,
        message: `Cannot approve return in status "${returnDoc.status}". Must be "requested"`,
      });
      return;
    }

    returnDoc.status = "approved";
    returnDoc.reviewedAt = new Date();
    await returnDoc.save();

    const order = await Order.findById(returnDoc.orderId);
    if (order) {
      await sendNotification(
        order.userId!.toString(),
        "Return Approved",
        `Your return for order ${getOrderNumber(order)} has been approved. Please ship the item back using the provided label.`,
      );
    }

    res.status(200).json({ success: true, data: returnDoc });
  } catch (error) {
    next(error);
  }
};

export const rejectReturn = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { adminNotes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid return ID" });
      return;
    }

    const returnDoc = await Return.findById(id).populate("orderId userId");
    if (!returnDoc) {
      res.status(404).json({ success: false, message: "Return not found" });
      return;
    }

    if (returnDoc.status !== "requested") {
      res.status(400).json({
        success: false,
        message: `Cannot reject return in status "${returnDoc.status}". Must be "requested"`,
      });
      return;
    }

    returnDoc.status = "rejected";
    returnDoc.adminNotes = adminNotes;
    returnDoc.reviewedAt = new Date();
    await returnDoc.save();

    const order = await Order.findById(returnDoc.orderId);
    if (order) {
      order.returnRequested = false;
      await order.save();

      await sendNotification(
        order.userId!.toString(),
        "Return Rejected",
        `Your return for order ${getOrderNumber(order)} has been rejected. Reason: ${adminNotes}`,
      );
    }

    res.status(200).json({ success: true, data: returnDoc });
  } catch (error) {
    next(error);
  }
};

export const markReturnInitiated = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid return ID" });
      return;
    }

    const returnDoc = await Return.findById(id).populate("orderId userId");
    if (!returnDoc) {
      res.status(404).json({ success: false, message: "Return not found" });
      return;
    }

    if (returnDoc.status !== "approved") {
      res.status(400).json({
        success: false,
        message: `Cannot mark as initiated from status "${returnDoc.status}". Must be "approved"`,
      });
      return;
    }

    returnDoc.status = "return_initiated";
    await returnDoc.save();

    const order = await Order.findById(returnDoc.orderId);
    if (order) {
      await sendNotification(
        order.userId!.toString(),
        "Return Label Sent",
        `Your return shipping label for order ${getOrderNumber(order)} is ready.`,
      );
    }

    res.status(200).json({ success: true, data: returnDoc });
  } catch (error) {
    next(error);
  }
};

export const markReturned = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid return ID" });
      return;
    }

    const returnDoc = await Return.findById(id).populate("orderId userId");
    if (!returnDoc) {
      res.status(404).json({ success: false, message: "Return not found" });
      return;
    }

    if (returnDoc.status !== "return_initiated") {
      res.status(400).json({
        success: false,
        message: `Cannot mark as returned from status "${returnDoc.status}". Must be "return_initiated"`,
      });
      return;
    }

    returnDoc.status = "returned";
    returnDoc.returnedAt = new Date();
    await returnDoc.save();

    const order = await Order.findById(returnDoc.orderId);
    if (order) {
      await sendNotification(
        order.userId!.toString(),
        "Item Received",
        `We received your returned item for order ${getOrderNumber(order)}. Refund is being processed.`,
      );
    }

    res.status(200).json({ success: true, data: returnDoc });
  } catch (error) {
    next(error);
  }
};

export const processRefund = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { refundAmount } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid return ID" });
      return;
    }

    const returnDoc = await Return.findById(id).populate("orderId userId");
    if (!returnDoc) {
      res.status(404).json({ success: false, message: "Return not found" });
      return;
    }

    if (returnDoc.status !== "returned") {
      res.status(400).json({
        success: false,
        message: `Cannot process refund from status "${returnDoc.status}". Must be "returned"`,
      });
      return;
    }

    const order = await Order.findById(returnDoc.orderId);
    if (!order || !order.paymentIntentId) {
      res.status(400).json({
        success: false,
        message: "Order not found or missing payment intent",
      });
      return;
    }

    const amount = refundAmount ?? order.total;

    const refundId = await processReturnRefund(
      returnDoc._id.toString(),
      order._id.toString(),
      amount,
    );

    const updatedReturn = await Return.findById(id).populate("orderId userId");

    await sendNotification(
      order.userId!.toString(),
      "Refund Processed",
      `Your refund of $${amount.toFixed(2)} for order ${getOrderNumber(order)} has been processed and will appear in 5-10 business days.`,
    );

    res.status(200).json({
      success: true,
      data: updatedReturn,
      refund: { id: refundId, amount },
    });
  } catch (error) {
    next(error);
  }
};
