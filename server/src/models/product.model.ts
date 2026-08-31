import mongoose, { Schema, model, Document } from "mongoose";

export interface IProduct extends Document {
  title: string;
  description: string;
  price: number;
  image: string;
  category: string;
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
    rating: { type: Number, required: true, min: 0, max: 5 },
    reviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Product = model<IProduct>("Product", productSchema);

export default Product;