from louvain_lab.louvain import Louvain
from louvain_lab.improved import ConnectedLouvain, count_disconnected
from louvain_lab.generator import make_dispute_graph
from louvain_lab.metrics import nmi, ari


def avg(xs):
    return sum(xs) / len(xs)


methods = {
    "baseline": lambda s: Louvain(seed=s),
    "connected": lambda s: ConnectedLouvain(seed=s),
}
scores = {name: {"Q": [], "NMI": [], "ARI": [], "extra": []} for name in methods}

for seed in range(30):
    g, truth = make_dispute_graph(n_rings=6, ring_size=12, p_in=0.4, p_out=0.03, seed=seed)
    for name, make in methods.items():
        part = make(seed).fit(g)
        scores[name]["Q"].append(g.modularity(part))
        scores[name]["NMI"].append(nmi(truth, part))
        scores[name]["ARI"].append(ari(truth, part))
        scores[name]["extra"].append(count_disconnected(g, part))

print("30 synthetic graphs, 72 nodes each")
for name, s in scores.items():
    print(
        f"{name:10} Q={avg(s['Q']):.4f}  NMI={avg(s['NMI']):.4f}  "
        f"ARI={avg(s['ARI']):.4f}  disconnected pieces={sum(s['extra'])}"
    )