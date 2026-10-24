import { Schema, model } from "mongoose";

const evidenceSchema = new Schema({
  url: { type: String, required: true },
  hash: { type: String },
  uploadedAt: { type: Date, default: Date.now },
});

const timelineSchema = new Schema({
  event: { type: String, required: true },
  note: { type: String },
  at: { type: Date, default: Date.now },
});

const disputeSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    issueType: {
      type: String,
      enum: ["wrong_item", "damaged", "missing_item", "fake_or_used"],
      required: true,
    },
    description: { type: String },
    status: {
      type: String,
      enum: ["open", "complaint_sent", "escalated", "resolved"],
      default: "open",
    },
    evidence: [evidenceSchema],
    timeline: [timelineSchema],
  },
  { timestamps: true }
);

export default model("Dispute", disputeSchema);