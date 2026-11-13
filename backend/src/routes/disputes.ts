import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Router } from "express";
import mongoose from "mongoose";
import Dispute from "../models/Dispute";
import Order from "../models/Order";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);
const uploadDir = path.join(__dirname, "../../uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

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

// Upload an evidence photo (file) and store its SHA-256 hash
router.post("/:id/evidence/upload", upload.single("image"), async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid dispute id" });
  }
  if (!req.file) {
    return res.status(400).json({ error: "Attach an image file in the 'image' field" });
  }
  const dispute = await Dispute.findOne({ _id: id, user: req.userId });
  if (!dispute) {
    return res.status(404).json({ error: "Dispute not found" });
  }
  const hash = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
  const ext = path.extname(req.file.originalname) || ".jpg";
  const filename = `${hash.slice(0, 16)}-${Date.now()}${ext}`;
  fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
  const url = `/uploads/${filename}`;
  dispute.evidence.push({ url, hash });
  dispute.timeline.push({ event: "photo_uploaded", note: `sha256:${hash.slice(0, 12)}` });
  await dispute.save();
  res.status(201).json(dispute);
});

// Compare listing photo with received photo using the AI service
router.post(
  "/:id/verdict",
  upload.fields([
    { name: "listing", maxCount: 1 },
    { name: "received", maxCount: 1 },
  ]),
  async (req: AuthRequest, res) => {
    const id = req.params.id as string;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid dispute id" });
    }
    const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
    const listing = files?.listing?.[0];
    const received = files?.received?.[0];
    if (!listing || !received) {
      return res.status(400).json({ error: "Attach 'listing' and 'received' images" });
    }
    const dispute = await Dispute.findOne({ _id: id, user: req.userId });
    if (!dispute) {
      return res.status(404).json({ error: "Dispute not found" });
    }

    const form = new FormData();
    form.append("listing", new Blob([new Uint8Array(listing.buffer)], { type: listing.mimetype }), listing.originalname);
    form.append("received", new Blob([new Uint8Array(received.buffer)], { type: received.mimetype }), received.originalname);

    const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const aiRes = await fetch(`${aiUrl}/compare`, { method: "POST", body: form });
      if (!aiRes.ok) {
        return res.status(502).json({ error: "AI service returned an error" });
      }
      const result: any = await aiRes.json();
      dispute.aiVerdict = result;
      dispute.timeline.push({
        event: "ai_verdict",
        note: `${result.verdict}: listing ${result.listing_color}, received ${result.received_color}`,
      });
      await dispute.save();
      res.json(result);
    } catch {
      res.status(502).json({ error: "AI service unreachable" });
    }
  }
);

const ISSUE_TEXT: Record<string, string> = {
  wrong_item: "I received a different item from the one I ordered.",
  damaged: "The item I received was damaged.",
  missing_item: "An item from my order was missing from the delivery.",
  fake_or_used: "The item I received appears to be fake or used.",
};

// Generate a ready-to-send complaint
router.get("/:id/complaint", async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid dispute id" });
  }
  const dispute = await Dispute.findOne({ _id: id, user: req.userId }).populate("order");
  if (!dispute) {
    return res.status(404).json({ error: "Dispute not found" });
  }
  const order: any = dispute.order;
  const verdict: any = dispute.aiVerdict;

  const lines: string[] = [];
  lines.push("Dear Support Team,");
  lines.push("");
  lines.push(`I am writing about my order of "${order.productName}"${order.platform ? ` on ${order.platform}` : ""}.`);
  lines.push(ISSUE_TEXT[dispute.issueType as string] || "There is a problem with my order.");
  if (dispute.description) {
    lines.push(`Details: ${dispute.description}`);
  }
  lines.push("");
  lines.push("Order details:");
  lines.push(`- Product: ${order.productName}`);
  if (order.color) lines.push(`- Ordered colour: ${order.color}`);
  if (order.size) lines.push(`- Size: ${order.size}`);
  if (order.seller) lines.push(`- Seller: ${order.seller}`);
  if (order.deliveredAt) lines.push(`- Delivered on: ${new Date(order.deliveredAt).toDateString()}`);
  if (verdict) {
    lines.push("");
    lines.push(
      `A colour comparison of the listing photo and my received photo gave: ${verdict.verdict} ` +
        `(listing: ${verdict.listing_color}, received: ${verdict.received_color}).`
    );
  }
  if (dispute.evidence.length > 0) {
    lines.push("");
    lines.push("I have attached photo evidence. Each photo has a SHA-256 fingerprint recorded at upload time:");
    dispute.evidence.forEach((e: any, i: number) => {
      lines.push(`- Photo ${i + 1}: ${e.hash ? e.hash.slice(0, 16) + "..." : "no hash"}`);
    });
  }
  lines.push("");
  lines.push("Please arrange a replacement or a full refund at the earliest.");
  lines.push("If this is not resolved, I will escalate to the platform's grievance officer and the National Consumer Helpline (1915).");
  lines.push("");
  lines.push("Regards");

  dispute.timeline.push({ event: "complaint_generated" });
  await dispute.save();

  res.json({
    subject: `Request for replacement/refund: ${order.productName}`,
    body: lines.join("\n"),
  });
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