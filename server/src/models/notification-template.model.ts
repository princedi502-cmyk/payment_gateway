import { Schema, model, Document } from "mongoose";

export interface INotificationTemplate extends Document {
  name: string;
  type: "email" | "push";
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationTemplateSchema = new Schema<INotificationTemplate>(
  {
    name: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ["email", "push"], required: true, index: true },
    subject: { type: String },
    content: { type: String, required: true },
    variables: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const NotificationTemplate = model<INotificationTemplate>("NotificationTemplate", notificationTemplateSchema);

export default NotificationTemplate;
