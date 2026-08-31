import mongoose, { Schema, model, type Document, type Types } from "mongoose";
import crypto from "crypto";

export interface IShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface IOrderItem {
  productId: Types.ObjectId;
  title: string;
  price: number;
  quantity: number;
  image: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  userId?: Types.ObjectId;
  contactInfo?: {
    fullName: string;
    email: string;
    phone: string;
  };
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  subtotal: number;
  tax: number;
  total: number;
  status: "pending" | "paid" | "failed" | "refunded" | "canceled";
  paymentIntentId?: string;
  paidAt?: Date;
  receiptSent?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  title: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, required: true },
});

const shippingAddressSchema = new Schema<IShippingAddress>({
  fullName: { type: String },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  zipCode: { type: String },
});

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    items: [orderItemSchema],
    shippingAddress: { type: shippingAddressSchema },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded", "canceled"],
    default: "pending",
  },
    paymentIntentId: { type: String },
    paidAt: { type: Date },
    receiptSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

orderSchema.pre("save", function () {
  if (!this.orderNumber) {
    this.orderNumber = `ORD-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  }
});

const Order = model<IOrder>("Order", orderSchema);

export default Order;