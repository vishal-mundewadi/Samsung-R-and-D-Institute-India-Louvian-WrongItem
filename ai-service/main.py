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