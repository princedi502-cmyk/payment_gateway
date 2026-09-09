import { type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import Review from "../../models/review.model.js";
import { logAdminAction } from "../services/admin-log.service.js";
import type { AdminRequest } from "../../middleware/admin-auth.middleware.js";

const deleteReviewImages = async (images: string[]): Promise<void> => {
  await Promise.all(
    images
      .filter((image) => image.startsWith("reviews/") && !image.includes(".."))
      .map((image) => fs.unlink(path.join(process.cwd(), "uploads", image)).catch(() => {})),
  );
};

export const getPendingReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ status: "pending" })
        .populate("userId", "name email")
        .populate("productId", "title image")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ status: "pending" }),
    ]);

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const productId = req.query.productId as string | undefined;

    const filter: any = {};
    if (status) {
      filter.status = status;
    }
    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      filter.productId = new mongoose.Types.ObjectId(productId);
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("userId", "name email")
        .populate("productId", "title image")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const params = req.params as { id: string };
    const id = params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid review ID" });
      return;
    }

    const review = await Review.findById(id)
      .populate("userId", "name email")
      .populate("productId", "title image")
      .populate("orderId", "orderNumber");

    if (!review) {
      res.status(404).json({ success: false, message: "Review not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const approveReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const params = req.params as { id: string };
    const id = params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid review ID" });
      return;
    }

    const review = await Review.findById(id);

    if (!review) {
      res.status(404).json({ success: false, message: "Review not found" });
      return;
    }

    if (review.status !== "pending") {
      res.status(400).json({
        success: false,
        message: `Cannot approve review with status "${review.status}". Must be "pending"`,
      });
      return;
    }

    review.status = "approved";
    review.isVerifiedPurchase = true;
    await review.save();
    await Review.updateProductAggregateRating(review.productId);

    await logAdminAction({
      req: req as AdminRequest,
      action: "review.approve",
      entityType: "review",
      entityId: id,
      previousState: { status: "pending" },
      newState: { status: "approved" },
    });

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const params = req.params as { id: string };
    const id = params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid review ID" });
      return;
    }

    const review = await Review.findById(id);

    if (!review) {
      res.status(404).json({ success: false, message: "Review not found" });
      return;
    }

    if (review.status !== "pending") {
      res.status(400).json({
        success: false,
        message: `Cannot reject review with status "${review.status}". Must be "pending"`,
      });
      return;
    }

    review.status = "rejected";
    await review.save();

    await logAdminAction({
      req: req as AdminRequest,
      action: "review.reject",
      entityType: "review",
      entityId: id,
      previousState: { status: "pending" },
      newState: { status: "rejected" },
    });

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const params = req.params as { id: string };
    const id = params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid review ID" });
      return;
    }

    const review = await Review.findById(id);

    if (!review) {
      res.status(404).json({ success: false, message: "Review not found" });
      return;
    }

    const previousState = { status: review.status, productId: review.productId.toString() };
    const wasApproved = review.status === "approved";
    const images = [...review.images];
    await review.deleteOne();
    await deleteReviewImages(images);
    if (wasApproved) await Review.updateProductAggregateRating(review.productId);

    await logAdminAction({
      req: req as AdminRequest,
      action: "review.delete",
      entityType: "review",
      entityId: id,
      previousState,
    });

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [pending, approved, rejected, total] = await Promise.all([
      Review.countDocuments({ status: "pending" }),
      Review.countDocuments({ status: "approved" }),
      Review.countDocuments({ status: "rejected" }),
      Review.countDocuments(),
    ]);

    const ratingDistribution = await Review.aggregate([
      { $match: { status: "approved" } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const item of ratingDistribution) {
      distribution[item._id as number] = item.count;
    }

    res.status(200).json({
      success: true,
      data: {
        pending,
        approved,
        rejected,
        total,
        distribution,
      },
    });
  } catch (error) {
    next(error);
  }
};
