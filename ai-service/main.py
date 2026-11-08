import io
import colorsys

import numpy as np
from fastapi import File, UploadFile
from PIL import Image
from collections import defaultdict

from fastapi import FastAPI
from pydantic import BaseModel

from louvain_lab.graph import Graph
from louvain_lab.improved import MultiStartLouvain, split_disconnected

app = FastAPI(title="WrongItem AI Service")


class DisputeIn(BaseModel):
    seller: str
    product: str
    count: int = 1


class SellerRiskRequest(BaseModel):
    disputes: list[DisputeIn]


@app.get("/health")
def health():
    return {"status": "ok", "service": "wrongitem-ai"}


@app.post("/seller-risk")
def seller_risk(req: SellerRiskRequest):
    g = Graph()
    complaints = defaultdict(int)
    for d in req.disputes:
        g.add_edge(f"seller:{d.seller}", f"product:{d.product}", d.count)
        complaints[d.seller] += d.count

    if not g.nodes():
        return {"clusters": [], "sellers": []}

    part = MultiStartLouvain(seed=0, starts=10).fit(g)
    part = split_disconnected(g, part)

    groups = defaultdict(list)
    for node, c in part.items():
        groups[c].append(node)

    clusters = []
    for c, members in groups.items():
        sellers = sorted(m[7:] for m in members if m.startswith("seller:"))
        products = sorted(m[8:] for m in members if m.startswith("product:"))
        clusters.append({
            "id": c,
            "sellers": sellers,
            "products": products,
            "total_complaints": sum(complaints[s] for s in sellers),
        })
    clusters.sort(key=lambda x: -x["total_complaints"])

    sellers_out = sorted(
        ({"seller": s, "complaints": n} for s, n in complaints.items()),
        key=lambda x: -x["complaints"],
    )
    return {"clusters": clusters, "sellers": sellers_out}
def dominant_color(data: bytes):
    img = Image.open(io.BytesIO(data)).convert("RGB").resize((64, 64))
    arr = np.asarray(img).reshape(-1, 3).astype(float)
    mask = ~((arr > 235).all(axis=1))  # ignore white background
    if mask.sum() < 50:
        mask = np.ones(len(arr), dtype=bool)
    arr = arr[mask]
    bins = (arr // 32).astype(int)
    keys = bins[:, 0] * 64 + bins[:, 1] * 8 + bins[:, 2]
    top = np.bincount(keys).argmax()
    return tuple(int(x) for x in arr[keys == top].mean(axis=0))


def color_name(rgb):
    r, g, b = [x / 255 for x in rgb]
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    if v < 0.22:
        return "black"
    if s < 0.15:
        return "white" if v > 0.8 else "gray"
    hue = h * 360
    if hue < 15 or hue >= 345:
        return "red"
    if hue < 40:
        return "brown" if v < 0.55 else "orange"
    if hue < 70:
        return "yellow"
    if hue < 165:
        return "green"
    if hue < 200:
        return "cyan"
    if hue < 260:
        return "blue"
    if hue < 300:
        return "purple"
    return "pink"


@app.post("/compare")
async def compare(listing: UploadFile = File(...), received: UploadFile = File(...)):
    a = dominant_color(await listing.read())
    b = dominant_color(await received.read())
    name_a, name_b = color_name(a), color_name(b)
    distance = round(float(np.linalg.norm(np.array(a) - np.array(b))), 1)
    match = name_a == name_b
    return {
        "verdict": "match" if match else "mismatch",
        "listing_color": name_a,
        "received_color": name_b,
        "listing_rgb": a,
        "received_rgb": b,
        "rgb_distance": distance,
        "note": "Color check only. Ask the user to confirm the result.",
    }