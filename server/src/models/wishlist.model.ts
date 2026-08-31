import mongoose, { Schema, model, Document } from "mongoose"

export interface IWishlist extends Document {
  user: mongoose.Types.ObjectId
  product: mongoose.Types.ObjectId
  createdAt: Date
}

const wishlistSchema = new Schema<IWishlist>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  },
  { timestamps: true }
)

wishlistSchema.index({ user: 1, product: 1 }, { unique: true })

const Wishlist = model<IWishlist>("Wishlist", wishlistSchema)

export default Wishlist
