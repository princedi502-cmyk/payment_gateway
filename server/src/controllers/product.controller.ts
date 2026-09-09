import { type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import Product from "../models/product.model.js";
import redis from "../config/redis.js";
import { BadRequestError, NotFoundError } from "../errors/AppError.ts";

const CACHE_TTL = 60;

export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const cacheKey = `products:${page}:${limit}`;

    try {
      const cachedRaw = await redis.get(cacheKey);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw) as any;
          res.status(200).json(cached);
          return;
        } catch {
          // corrupted cache, fall through to fresh fetch
        }
      }
    } catch {
      // Redis unavailable, fall through to fresh fetch
    }

    const [products, total] = await Promise.all([
      Product.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(),
    ]);

    const response = {
      success: true,
      count: products.length,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    try {
      await redis.set(cacheKey, JSON.stringify(response), "EX", CACHE_TTL);
    } catch {
      // Redis unavailable, ignore cache write
    }

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError("Invalid product ID");
    }

    const cacheKey = `product:${id}`;

    try {
      const cachedRaw = await redis.get(cacheKey);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw) as any;
          res.status(200).json(cached);
          return;
        } catch {
          // corrupted cache, fall through to fresh fetch
        }
      }
    } catch {
      // Redis unavailable, fall through to fresh fetch
    }

    const product = await Product.findById(id);

    if (!product) {
      throw new NotFoundError("Product");
    }

    const response = {
      success: true,
      count: 1,
      data: product,
    };

    try {
      await redis.set(cacheKey, JSON.stringify(response), "EX", CACHE_TTL);
    } catch {
      // Redis unavailable, ignore cache write
    }

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};