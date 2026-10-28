import mongoose, { Schema, Document, Model } from "mongoose";
import { MealType, MealStatus } from "@/types";

export interface IMealDocument extends Document {
  userId: string;
  date: string; // YYYY-MM-DD local date
  mealType: MealType;
  status: MealStatus;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

const MealSchema = new Schema<IMealDocument>(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    date: {
      type: String,
      required: [true, "Date is required"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"],
    },
    mealType: {
      type: String,
      enum: {
        values: ["lunch", "dinner"],
        message: "Meal type must be lunch or dinner",
      },
      required: [true, "Meal type is required"],
    },
    status: {
      type: String,
      enum: {
        values: ["received", "not_received"],
        message: "Status must be received or not_received",
      },
      required: [true, "Status is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
  },
  { timestamps: true }
);

// One record per user per date per meal type
MealSchema.index({ userId: 1, date: 1, mealType: 1 }, { unique: true });
MealSchema.index({ userId: 1, date: -1 });

const Meal: Model<IMealDocument> =
  mongoose.models.Meal || mongoose.model<IMealDocument>("Meal", MealSchema);

export default Meal;
