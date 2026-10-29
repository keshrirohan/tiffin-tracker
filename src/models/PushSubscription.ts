import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPushSubscriptionDocument extends Document {
  userId: string;
  // Web Push (VAPID) subscription object — used as fallback
  subscription?: object;
  // Firebase Cloud Messaging device token — primary transport
  fcmToken?: string;
  userAgent?: string;
  createdAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscriptionDocument>(
  {
    userId: { type: String, required: true, index: true },
    // VAPID Web Push subscription (endpoint + keys)
    subscription: { type: Object },
    // FCM registration token
    fcmToken: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One VAPID subscription per unique endpoint per user
PushSubscriptionSchema.index(
  { userId: 1, "subscription.endpoint": 1 },
  { unique: true, sparse: true }
);

// One FCM token per unique token per user
PushSubscriptionSchema.index(
  { userId: 1, fcmToken: 1 },
  { unique: true, sparse: true }
);

const PushSubscriptionModel: Model<IPushSubscriptionDocument> =
  mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscriptionDocument>("PushSubscription", PushSubscriptionSchema);

export default PushSubscriptionModel;
