import mongoose, { Schema, model, Document } from "mongoose"

export interface IWebhookEvent extends Document {
  eventId: string
  type: string
  processedAt: Date
}

const webhookEventSchema = new Schema<IWebhookEvent>({
  eventId: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  processedAt: { type: Date, required: true },
})

webhookEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

const WebhookEvent = model<IWebhookEvent>("WebhookEvent", webhookEventSchema)

export default WebhookEvent
