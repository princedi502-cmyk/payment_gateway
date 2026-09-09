import { type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import User from "../../models/user.model.ts";
import { generateToken } from "../../config/jwt.ts";
import { logAdminAction } from "../services/admin-log.service.ts";
import type { AdminRequest } from "../../middleware/admin-auth.middleware.ts";

export const adminLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    if (!user || !user.password) {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
      return;
    }

    if (user.role !== "admin") {
      res.status(403).json({
        success: false,
        message: "Admin access required",
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
      return;
    }

    const token = generateToken(user._id.toString());

    logAdminAction({
      req: req as AdminRequest,
      action: "auth.login",
      entityType: "user",
      entityId: user._id.toString(),
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const adminMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const user = await User.findById(adminReq.adminId).select("email name role isVerified");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Admin not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const adminLogout = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};
