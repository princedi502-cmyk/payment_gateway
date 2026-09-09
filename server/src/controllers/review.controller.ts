import { type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import Review from "../models/review.model.js";
import Order from "../models/order.model.js";
import { generateReviewImageFilename, validateMagicBytes } from "../config/multer.js";

const reviewUploadsDirectory = path.join(process.cwd(), "uploads", "reviews");

const deleteReviewImages = async (images: string[]): Promise<void> => {
  await Promise.all(
    images
      .filter((image) => image.startsWith("reviews/") && !image.includes(".."))
      .map((image) => fs.unlink(path.join(process.cwd(), "uploads", image)).catch(() => {})),
  );
};

/** Validate every file before touching the filesystem, then clean up partial writes on failure. */
const storeReviewImages = async (files: Express.Multer.File[]): Promise<string[]> => {
  const detectedFiles = files.map((file) => ({ file, extension: validateMagicBytes(file.buffer) }));
  if (detectedFiles.some(({ extension }) => !extension)) {
    throw new Error("File content does not match a supported image type");
  }

  await fs.mkdir(reviewUploadsDirectory, { recursive: true });
  const uploadedImages: string[] = [];

  try {
    for (const { file, extension } of detectedFiles) {
      const filename = generateReviewImageFilename(extension!);
      await fs.writeFile(path.join(reviewUploadsDirectory, filename), file.buffer);
      uploadedImages.push(`reviews/${filename}`);
    }
    return uploadedImages;
  } catch (error) {
    await deleteReviewImages(uploadedImages);
    throw error;
  }
};

export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const body = req.body as { productId: string; rating: number; comment?: string };
    const productId = body.productId as string;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const hasPurchased = await Order.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: "paid",
      "items.productId": new mongoose.Types.ObjectId(productId),
    });

    if (!hasPurchased) {
      res.status(403).json({
        success: false,
        message: "You must purchase this product before leaving a review",
      });
      return;
    }

    const existingReview = await Review.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      productId: new mongoose.Types.ObjectId(productId),
    });

    if (existingReview) {
      res.status(409).json({
        success: false,
        message: "You have already reviewed this product",
      });
      return;
    }

    const files = req.files as Express.Multer.File[];
    let uploadedImages: string[] = [];
    try {
      uploadedImages = files?.length ? await storeReviewImages(files) : [];
    } catch (error) {
      if (error instanceof Error && error.message === "File content does not match a supported image type") {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
      throw error;
    }

    const reviewData: any = {
      userId: new mongoose.Types.ObjectId(userId),
      productId: new mongoose.Types.ObjectId(productId),
      orderId: hasPurchased._id,
      rating: Number(body.rating),
      images: uploadedImages,
      status: "pending",
      // Submission is already restricted to a paid order, so this is a verified purchase
      // regardless of when a moderator makes it public.
      isVerifiedPurchase: true,
    };

    if (body.comment) {
      reviewData.comment = body.comment;
    }

    let review;
    try {
      review = await Review.create(reviewData);
    } catch (error) {
      // A concurrent submission can still win after the preflight duplicate check.
      await deleteReviewImages(uploadedImages);
      if ((error as any).code === 11000) {
        res.status(409).json({
          success: false,
          message: "You have already reviewed this product",
        });
        return;
      }
      throw error;
    }

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    if ((error as any).code === 11000) {
      res.status(409).json({
        success: false,
        message: "You have already reviewed this product",
      });
      return;
    }
    next(error);
  }
};

export const getProductReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const params = req.params as { productId: string };
    const productId = params.productId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const productObjectId = new mongoose.Types.ObjectId(productId);
    const userId = (req as any).userId;
    const userObjectId = userId && mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : null;

    const [reviews, total] = await Promise.all([
      Review.find({
        productId: productObjectId,
        status: "approved",
      })
        .populate("userId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({
        productId: productObjectId,
        status: "approved",
      }),
    ]);

    const userPendingReview = userObjectId
      ? await Review.findOne({
          productId: productObjectId,
          userId: userObjectId,
          status: "pending",
        }).populate("userId", "name")
      : null;

    const aggregation = await Review.aggregate([
      {
        $match: {
          productId: productObjectId,
          status: "approved",
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = aggregation[0] || { avgRating: 0, count: 0 };

    res.status(200).json({
      success: true,
      data: reviews,
      userPendingReview: userPendingReview || null,
      stats: {
        averageRating: Math.round(stats.avgRating * 10) / 10,
        totalReviews: stats.count,
      },
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

export const getMyReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ userId: new mongoose.Types.ObjectId(userId) })
        .populate("productId", "title image")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }),
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

export const updateReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const params = req.params as { id: string };
    const id = params.id;
    const body = req.body as { rating?: number; comment?: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid review ID" });
      return;
    }

    const review = await Review.findById(id);

    if (!review) {
      res.status(404).json({ success: false, message: "Review not found" });
      return;
    }

    if (review.userId.toString() !== userId) {
      res.status(403).json({ success: false, message: "You can only edit your own reviews" });
      return;
    }

    const files = req.files as Express.Multer.File[];
    const hasTextChanges = body.rating !== undefined || body.comment !== undefined;
    const hasImageChanges = Boolean(files?.length);
    if (!hasTextChanges && !hasImageChanges) {
      res.status(400).json({ success: false, message: "Provide a rating, review text, or photos to update" });
      return;
    }

    if (body.rating !== undefined) {
      review.rating = Number(body.rating);
    }
    if (body.comment !== undefined) {
      review.comment = body.comment as string;
    }

    const wasApproved = review.status === "approved";
    // Both published and rejected content needs another moderation pass after
    // an author changes it. Pending content remains pending.
    if (review.status !== "pending" && (hasTextChanges || hasImageChanges)) {
      review.status = "pending";
    }

    const oldImages = [...review.images];
    let newImages: string[] | null = null;
    if (hasImageChanges) {
      try {
        newImages = await storeReviewImages(files);
        review.images = newImages;
      } catch (error) {
        if (error instanceof Error && error.message === "File content does not match a supported image type") {
          res.status(400).json({ success: false, message: error.message });
          return;
        }
        throw error;
      }
    }

    try {
      await review.save();
    } catch (error) {
      if (newImages) await deleteReviewImages(newImages);
      throw error;
    }
    if (newImages) await deleteReviewImages(oldImages);
    if (wasApproved) await Review.updateProductAggregateRating(review.productId);

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
    const userId = (req as any).userId;
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

    if (review.userId.toString() !== userId) {
      res.status(403).json({ success: false, message: "You can only delete your own reviews" });
      return;
    }

    const wasApproved = review.status === "approved";
    const images = [...review.images];
    await review.deleteOne();
    await deleteReviewImages(images);
    if (wasApproved) await Review.updateProductAggregateRating(review.productId);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const hasUserReviewedProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const params = req.params as { productId: string };
    const productId = params.productId;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const productObjectId = new mongoose.Types.ObjectId(productId);

    const review = await Review.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      productId: productObjectId,
    });

    res.status(200).json({
      success: true,
      hasReviewed: !!review,
      review: review || null,
    });
  } catch (error) {
    next(error);
  }
};

export const canUserReviewProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const params = req.params as { productId: string };
    const productId = params.productId;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const productObjectId = new mongoose.Types.ObjectId(productId);

    const hasPurchased = await Order.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: "paid",
      "items.productId": productObjectId,
    });

    const hasReviewed = await Review.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      productId: productObjectId,
    });

    res.status(200).json({
      success: true,
      canReview: !!hasPurchased && !hasReviewed,
      hasPurchased: !!hasPurchased,
      hasReviewed: !!hasReviewed,
      review: hasReviewed || null,
    });
  } catch (error) {
    next(error);
  }
};
