import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPushSubscriptionDocument extends Document {
  userId: string;
  subscription: object; // raw PushSubscription JSON
  userAgent?: string;
  createdAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscriptionDocument>(
  {
    userId: { type: String, required: true, index: true },
    subscription: { type: Object, required: true },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One subscription object per unique endpoint per user
PushSubscriptionSchema.index(
  { userId: 1, "subscription.endpoint": 1 },
  { unique: true }
);

const PushSubscriptionModel: Model<IPushSubscriptionDocument> =
  mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscriptionDocument>("PushSubscription", PushSubscriptionSchema);

export default PushSubscriptionModel;
