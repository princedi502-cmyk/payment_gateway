import { Schema, model, Document, Types } from "mongoose";

export type ReturnReason =
  | "defective"
  | "damaged_in_shipping"
  | "wrong_item"
  | "not_as_described"
  | "no_longer_needed"
  | "size_issue"
  | "other";

export type ReturnStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "return_initiated"
  | "returned"
  | "refunded";

export interface IReturn extends Document {
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  reason: ReturnReason;
  description?: string;
  image?: string;
  status: ReturnStatus;
  adminNotes?: string;
  refundAmount?: number;
  refundPaymentIntentId?: string;
  refundedAt?: Date;
  requestedAt: Date;
  reviewedAt?: Date;
  returnedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const returnSchema = new Schema<IReturn>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reason: {
      type: String,
      enum: ["defective", "damaged_in_shipping", "wrong_item", "not_as_described", "no_longer_needed", "size_issue", "other"],
      required: true,
    },
    description: { type: String, maxlength: 1000 },
    image: { type: String },
    status: {
      type: String,
      enum: ["requested", "approved", "rejected", "return_initiated", "returned", "refunded"],
      default: "requested",
      index: true,
    },
    adminNotes: { type: String, maxlength: 1000 },
    refundAmount: { type: Number },
    refundPaymentIntentId: { type: String },
    refundedAt: { type: Date },
    requestedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    returnedAt: { type: Date },
  },
  { timestamps: true }
);

const Return = model<IReturn>("Return", returnSchema);

export default Return;
