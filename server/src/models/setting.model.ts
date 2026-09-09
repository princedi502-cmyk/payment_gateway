import { Schema, model, Document, Types } from "mongoose";

export interface ISetting extends Document {
  key: string;
  value: any;
  type: "string" | "number" | "boolean" | "json";
  category: "general" | "email" | "payment" | "notification" | "return" | "security";
  description: string;
  isPublic: boolean;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const settingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    type: {
      type: String,
      enum: ["string", "number", "boolean", "json"],
      required: true,
    },
    category: {
      type: String,
      enum: ["general", "email", "payment", "notification", "return", "security"],
      required: true,
      index: true,
    },
    description: { type: String, default: "" },
    isPublic: { type: Boolean, default: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Setting = model<ISetting>("Setting", settingSchema);

export default Setting;
