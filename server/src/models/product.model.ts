import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IProduct extends Document {
  title: string;
  description: string;
  price: number;
  image: string;
  category: string;
  categoryId?: Types.ObjectId;
  sku?: string;
  stock?: number;
  isActive: boolean;
  rating: number;
  reviews: number;
}

const productSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    category: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", index: true },
    sku: { type: String, unique: true, sparse: true },
    stock: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    // These fields are a projection of approved Review records and must not be
    // supplied as independent product data.
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Product = model<IProduct>("Product", productSchema);

export default Product;
