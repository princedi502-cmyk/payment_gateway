import { Router } from "express";
import { uploadSingleImage } from "../../config/multer.ts";
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts,
  uploadProductImage,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/admin-product.controller.ts";

const router = Router();

router.get("/", getProducts);
router.post("/", createProduct);
router.get("/:id", getProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.post("/bulk-delete", bulkDeleteProducts);
router.post("/:id/image", uploadSingleImage, uploadProductImage);

export default router;
