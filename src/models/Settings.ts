import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISettingsDocument extends Document {
  userId: string;
  mealPrice: number;
  lunchReminderEnabled: boolean;
  lunchReminderTime: string;
  dinnerReminderEnabled: boolean;
  dinnerReminderTime: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettingsDocument>(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      unique: true,
      index: true,
    },
    mealPrice: {
      type: Number,
      required: [true, "Meal price is required"],
      min: [1, "Meal price must be at least 1"],
      default: 60,
    },
    lunchReminderEnabled: { type: Boolean, default: false },
    lunchReminderTime: {
      type: String,
      default: "14:00",
      match: [/^\d{2}:\d{2}$/, "Time must be in HH:MM format"],
    },
    dinnerReminderEnabled: { type: Boolean, default: false },
    dinnerReminderTime: {
      type: String,
      default: "21:00",
      match: [/^\d{2}:\d{2}$/, "Time must be in HH:MM format"],
    },
  },
  { timestamps: true }
);

const Settings: Model<ISettingsDocument> =
  mongoose.models.Settings ||
  mongoose.model<ISettingsDocument>("Settings", SettingsSchema);

export default Settings;
