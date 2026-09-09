import mongoose, { Schema, model, Document, type Types } from "mongoose";
import Product from "./product.model.js";

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface IReview extends Document {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  orderId: Types.ObjectId;
  rating: number;
  comment?: string;
  images: string[];
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IReviewModel extends mongoose.Model<IReview> {
  updateProductAggregateRating(productId: Types.ObjectId): Promise<void>;
}

const reviewSchema = new Schema<IReview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 2000 },
    images: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    isVerifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, status: 1 });

reviewSchema.statics.updateProductAggregateRating = async function (productId: Types.ObjectId): Promise<void> {
  try {
    const result = await this.aggregate([
      { $match: { productId: productId, status: "approved" } },
      {
        $group: {
          _id: "$productId",
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    if (result.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        rating: Math.round(result[0].avgRating * 10) / 10,
        reviews: result[0].count,
      });
    } else {
      await Product.findByIdAndUpdate(productId, {
        rating: 0,
        reviews: 0,
      });
    }

    const { default: redis } = await import("../config/redis.js");
    try {
      await redis.del(`product:${productId.toString()}`);
    } catch {
      // Redis unavailable, ignore
    }
  } catch (error) {
    console.error("Failed to update product aggregate rating:", error);
  }
};

const Review = model<IReview, IReviewModel>("Review", reviewSchema);

export default Review;
