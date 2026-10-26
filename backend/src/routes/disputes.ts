import { Router } from "express";
import mongoose from "mongoose";
import Dispute from "../models/Dispute";
import Order from "../models/Order";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const ISSUE_TYPES = ["wrong_item", "damaged", "missing_item", "fake_or_used"];
const STATUSES = ["open", "complaint_sent", "escalated", "resolved"];

// Open a dispute for one of your orders
router.post("/", async (req: AuthRequest, res) => {
  const { orderId, issueType, description } = req.body;
  if (!orderId || !mongoose.isValidObjectId(orderId)) {
    return res.status(400).json({ error: "Valid orderId is required" });
  }
  if (!ISSUE_TYPES.includes(issueType)) {
    return res.status(400).json({ error: `issueType must be one of: ${ISSUE_TYPES.join(", ")}` });
  }
  const order = await Order.findOne({ _id: orderId, user: req.userId });
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  const dispute = await Dispute.create({
    user: req.userId,
    order: order._id,
    issueType,
    description,
    timeline: [{ event: "dispute_opened", note: `Issue: ${issueType}` }],
  });
  res.status(201).json(dispute);
});

// List your disputes
router.get("/", async (req: AuthRequest, res) => {
  const disputes = await Dispute.find({ user: req.userId })
    .populate("order")
    .sort({ createdAt: -1 });
  res.json(disputes);
});

// Get one dispute
router.get("/:id", async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid dispute id" });
  }
  const dispute = await Dispute.findOne({ _id: id, user: req.userId }).populate("order");
  if (!dispute) {
    return res.status(404).json({ error: "Dispute not found" });
  }
  res.json(dispute);
});

// Add an evidence photo (URL for now; real upload comes later)
router.post("/:id/evidence", async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const { url, hash } = req.body;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid dispute id" });
  }
  if (!url) {
    return res.status(400).json({ error: "url is required" });
  }
  const dispute = await Dispute.findOne({ _id: id, user: req.userId });
  if (!dispute) {
    return res.status(404).json({ error: "Dispute not found" });
  }
  dispute.evidence.push({ url, hash });
  dispute.timeline.push({ event: "evidence_added", note: url });
  await dispute.save();
  res.status(201).json(dispute);
});

// Change status
router.patch("/:id/status", async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const { status, note } = req.body;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid dispute id" });
  }
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${STATUSES.join(", ")}` });
  }
  const dispute = await Dispute.findOne({ _id: id, user: req.userId });
  if (!dispute) {
    return res.status(404).json({ error: "Dispute not found" });
  }
  dispute.status = status;
  dispute.timeline.push({ event: `status_${status}`, note });
  await dispute.save();
  res.json(dispute);
});

export default router;