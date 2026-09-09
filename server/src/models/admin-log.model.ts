import { Schema, model, Document, Types } from "mongoose";

export interface IAdminLog extends Document {
  adminId: Types.ObjectId;
  action: string;
  entityType: "order" | "product" | "user" | "return" | "payment" | "setting" | "review";
  entityId?: Types.ObjectId;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  ipAddress: string;
  userAgent?: string;
  createdAt: Date;
}

const adminLogSchema = new Schema<IAdminLog>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true },
    entityType: {
      type: String,
      enum: ["order", "product", "user", "return", "payment", "setting", "review"],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId },
    previousState: { type: Schema.Types.Mixed },
    newState: { type: Schema.Types.Mixed },
    ipAddress: { type: String, required: true },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

adminLogSchema.index({ entityType: 1, entityId: 1 });
adminLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const AdminLog = model<IAdminLog>("AdminLog", adminLogSchema);

export default AdminLog;
