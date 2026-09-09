import { Router, type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import { processReturnRefund } from "../services/refund.service.js";

export const requireInternalApiKey = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const providedKey =
    (req.headers["x-internal-api-key"] as string) || (req.headers["authorization"]?.split(" ")[1] as string);

  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) {
    res.status(500).json({
      success: false,
      message: "INTERNAL_API_KEY is not configured",
    });
    return;
  }

  try {
    if (!crypto.timingSafeEqual(Buffer.from(providedKey || ""), Buffer.from(expectedKey))) {
      res.status(401).json({
        success: false,
        message: "Invalid internal API key",
      });
      return;
    }
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid internal API key",
    });
    return;
  }

  next();
};

export const internalRefund = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { returnId, orderId, amount } = req.body;

    if (!returnId || !orderId) {
      res.status(400).json({
        success: false,
        message: "returnId and orderId are required",
      });
      return;
    }

    const refundId = await processReturnRefund(returnId, orderId, amount);

    res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      data: { refundId },
    });
  } catch (error) {
    next(error);
  }
};

const router = Router();

router.post("/refund", requireInternalApiKey, internalRefund);

export default router;
