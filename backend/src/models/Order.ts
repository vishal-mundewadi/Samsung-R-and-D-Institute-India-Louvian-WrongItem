import { Schema, model } from "mongoose";

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    platform: { type: String, default: "Flipkart" },
    seller: { type: String },
    productName: { type: String, required: true },
    color: { type: String },
    size: { type: String },
    listingImageUrl: { type: String },
    orderedAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

export default model("Order", orderSchema);