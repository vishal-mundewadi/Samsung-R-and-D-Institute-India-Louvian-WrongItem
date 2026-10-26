import { Router } from "express";
import Order from "../models/Order";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.post("/", async (req: AuthRequest, res) => {
  const { productName, platform, seller, color, size, listingImageUrl, orderedAt, deliveredAt } = req.body;
  if (!productName) {
    return res.status(400).json({ error: "productName is required" });
  }
  const order = await Order.create({
    user: req.userId,
    productName,
    platform,
    seller,
    color,
    size,
    listingImageUrl,
    orderedAt,
    deliveredAt,
  });
  res.status(201).json(order);
});

router.get("/", async (req: AuthRequest, res) => {
  const orders = await Order.find({ user: req.userId }).sort({ createdAt: -1 });
  res.json(orders);
});

export default router;