import csv
import time

from louvain_lab.louvain import Louvain
from louvain_lab.improved import ConnectedLouvain, MultiStartLouvain, count_disconnected
from louvain_lab.generator import make_dispute_graph
from louvain_lab.metrics import nmi, ari

SIZES = [20, 15, 12, 10, 8, 6, 5]
LEVELS = [
    ("easy", 0.50, 0.02),
    ("medium", 0.35, 0.04),
    ("hard", 0.25, 0.06),
    ("sparse", 0.18, 0.08),
    ("sparser", 0.12, 0.08),
    ("noisy", 0.10, 0.10),
]
SEEDS = 90

METHODS = {
    "baseline": lambda s: Louvain(seed=s),
    "degree_order": lambda s: Louvain(seed=s, node_order="degree"),
    "connected": lambda s: ConnectedLouvain(seed=s),
    "multi_start": lambda s: MultiStartLouvain(seed=s),
}

rows = []
for li, (level, p_in, p_out) in enumerate(LEVELS):
    for seed in range(SEEDS):
        g, truth = make_dispute_graph(
            ring_sizes=SIZES, p_in=p_in, p_out=p_out, seed=seed * 7 + li
        )
        for name, make in METHODS.items():
            t0 = time.perf_counter()
            part = make(seed).fit(g)
            dt = time.perf_counter() - t0
            rows.append({
                "level": level, "p_in": p_in, "p_out": p_out, "seed": seed,
                "method": name,
                "modularity": round(g.modularity(part), 5),
                "nmi": round(nmi(truth, part), 5),
                "ari": round(ari(truth, part), 5),
                "communities": len(set(part.values())),
                "disconnected_extra": count_disconnected(g, part),
                "seconds": round(dt, 5),
            })

with open("results.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)

print(f"graphs: {len(LEVELS) * SEEDS}, runs: {len(rows)}, saved results.csv")
print(f"{'level':8} {'method':13} {'Q':>7} {'NMI':>7} {'ARI':>7} {'disc':>5}")
for level, _, _ in LEVELS:
    for name in METHODS:
        sel = [r for r in rows if r["level"] == level and r["method"] == name]
        n = len(sel)
        print(
            f"{level:8} {name:13} "
            f"{sum(r['modularity'] for r in sel) / n:7.4f} "
            f"{sum(r['nmi'] for r in sel) / n:7.4f} "
            f"{sum(r['ari'] for r in sel) / n:7.4f} "
            f"{sum(r['disconnected_extra'] for r in sel):5d}"
        )