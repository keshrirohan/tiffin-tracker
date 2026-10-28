import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPaymentDocument extends Document {
  userId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than zero"],
    },
    date: {
      type: String,
      required: [true, "Date is required"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"],
    },
    note: {
      type: String,
      trim: true,
      maxlength: [200, "Note cannot exceed 200 characters"],
    },
  },
  { timestamps: true }
);

PaymentSchema.index({ userId: 1, date: -1 });

const Payment: Model<IPaymentDocument> =
  mongoose.models.Payment ||
  mongoose.model<IPaymentDocument>("Payment", PaymentSchema);

export default Payment;
