import { Router } from "express";
import Dispute from "../models/Dispute";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Seller/product clusters from all disputes, computed by the AI service (Louvain)
router.get("/seller-risk", async (_req, res) => {
  const disputes = await Dispute.find().populate("order");
  const counts = new Map<string, number>();
  for (const d of disputes) {
    const order: any = d.order;
    if (!order || !order.seller) continue;
    const key = `${order.seller}||${order.productName}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const payload = Array.from(counts.entries()).map(([key, count]) => {
    const [seller, product] = key.split("||");
    return { seller, product, count };
  });
  if (payload.length === 0) {
    return res.json({ clusters: [], sellers: [] });
  }

  const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
  try {
    const aiRes = await fetch(`${aiUrl}/seller-risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disputes: payload }),
    });
    if (!aiRes.ok) {
      return res.status(502).json({ error: "AI service returned an error" });
    }
    res.json(await aiRes.json());
  } catch {
    res.status(502).json({ error: "AI service unreachable" });
  }
});

export default router;