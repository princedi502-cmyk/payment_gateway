import { type Request, type Response, type NextFunction } from "express";
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import Product from "../../models/product.model.ts";
import Category from "../../models/category.model.ts";
import { logAdminAction } from "../services/admin-log.service.ts";
import type { AdminRequest } from "../../middleware/admin-auth.middleware.ts";
import { getQueryParam, getQueryParamAsInt, getQueryParamAsBool, getRouteParam } from "../utils/query-helpers.ts";

export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const q = req.query as Record<string, any>;
    const page = getQueryParamAsInt(q, "page", 1);
    const limit = getQueryParamAsInt(q, "limit", 20);
    const sort = getQueryParam(q, "sort", "createdAt");
    const order = getQueryParam(q, "order", "desc");
    const category = getQueryParam(q, "category");
    const isActive = getQueryParamAsBool(q, "isActive");
    const search = getQueryParam(q, "search");

    const query: Record<string, any> = {};

    if (category) query.categoryId = category;
    if (isActive !== undefined) query.isActive = isActive;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortOrder = order === "asc" ? 1 : -1;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("categoryId", "name slug")
        .sort({ [sort]: sortOrder })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: products,
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

export const getProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getRouteParam(req.params as Record<string, string>, "id");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const product = await Product.findById(id).populate("categoryId", "name slug");

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const { rating: _rating, reviews: _reviews, ...productData } = req.body;

    const product = await Product.create(productData);

    await logAdminAction({
      req: adminReq,
      action: "product.create",
      entityType: "product",
      entityId: product._id.toString(),
      newState: product.toObject(),
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const id = getRouteParam(req.params as Record<string, string>, "id");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const previousProduct = await Product.findById(id);
    if (!previousProduct) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    const { rating: _rating, reviews: _reviews, ...productUpdates } = req.body;
    const product = await Product.findByIdAndUpdate(id, productUpdates, {
      new: true,
      runValidators: true,
    });

    await logAdminAction({
      req: adminReq,
      action: "product.update",
      entityType: "product",
      entityId: id,
      previousState: previousProduct.toObject(),
      newState: product ? product.toObject() : undefined,
    });

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const id = getRouteParam(req.params as Record<string, string>, "id");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    await logAdminAction({
      req: adminReq,
      action: "product.delete",
      entityType: "product",
      entityId: id,
      previousState: product.toObject(),
    });

    res.status(200).json({ success: true, message: "Product deleted" });
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, message: "IDs array is required" });
      return;
    }

    const result = await Product.deleteMany({ _id: { $in: ids } });

    await logAdminAction({
      req: adminReq,
      action: "product.bulk_delete",
      entityType: "product",
      newState: { deletedCount: result.deletedCount, ids },
    });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} products deleted`,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadProductImage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const id = getRouteParam(req.params as Record<string, string>, "id");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: "Image file is required" });
      return;
    }

    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `product-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const uploadDir = path.join(process.cwd(), "uploads", "products");
    const filepath = path.join(uploadDir, filename);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(filepath, req.file.buffer);

    const imagePath = `products/${filename}`;
    product.image = imagePath;
    await product.save();

    await logAdminAction({
      req: adminReq,
      action: "product.upload_image",
      entityType: "product",
      entityId: id,
      newState: { image: imagePath },
    });

    res.status(200).json({ success: true, data: { image: imagePath } });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1, name: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const category = await Category.create(req.body);

    await logAdminAction({
      req: adminReq,
      action: "category.create",
      entityType: "product",
      entityId: category._id.toString(),
      newState: category.toObject(),
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const id = getRouteParam(req.params as Record<string, string>, "id");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid category ID" });
      return;
    }

    const previousCategory = await Category.findById(id);
    if (!previousCategory) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    const category = await Category.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    await logAdminAction({
      req: adminReq,
      action: "category.update",
      entityType: "product",
      entityId: id,
      previousState: previousCategory.toObject(),
      newState: category ? category.toObject() : undefined,
    });

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const id = getRouteParam(req.params as Record<string, string>, "id");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid category ID" });
      return;
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    await logAdminAction({
      req: adminReq,
      action: "category.delete",
      entityType: "product",
      entityId: id,
      previousState: category.toObject(),
    });

    res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error) {
    next(error);
  }
};
