import { type Request, type Response, type NextFunction } from "express"
import Wishlist from "../models/wishlist.model.ts"
import Product from "../models/product.model.ts"

export const getWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId as string

    const items = await Wishlist.find({ user: userId } as any)
      .populate({
        path: "product",
        model: "Product",
      })
      .sort({ createdAt: -1 })

    const filtered = items.filter((item) => item.product != null)

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered.map((item) => ({
        _id: item._id,
        product: item.product,
        createdAt: item.createdAt,
      })),
    })
  } catch (error) {
    next(error)
  }
}

export const addToWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId as string
    const { productId } = req.params

    const existing = await Wishlist.findOne({ user: userId, product: productId } as any)
    if (existing) {
      res.status(409).json({
        success: false,
        message: "Product already in wishlist",
      })
      return
    }

    const item = await Wishlist.create({ user: userId, product: productId } as any)

    const populated = await Wishlist.findById(item._id).populate({
      path: "product",
      model: "Product",
    })

    res.status(201).json({
      success: true,
      count: 1,
      data: {
        _id: populated!._id,
        product: populated!.product,
        createdAt: populated!.createdAt,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const removeFromWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId as string
    const { productId } = req.params

    const deleted = await Wishlist.findOneAndDelete({
      user: userId,
      product: productId,
    } as any)

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "Product not found in wishlist",
      })
      return
    }

    res.status(200).json({
      success: true,
      message: "Removed from wishlist",
    })
  } catch (error) {
    next(error)
  }
}

export const checkWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId as string
    const { productId } = req.params

    const exists = await Wishlist.findOne({ user: userId, product: productId } as any)

    res.status(200).json({
      success: true,
      inWishlist: !!exists,
    })
  } catch (error) {
    next(error)
  }
}
