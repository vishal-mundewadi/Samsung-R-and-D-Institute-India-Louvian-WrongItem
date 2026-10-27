from louvain_lab.graph import Graph
from louvain_lab.louvain import Louvain

g = Graph()
for u, v in [(0, 1), (1, 2), (0, 2), (3, 4), (4, 5), (3, 5), (2, 3)]:
    g.add_edge(u, v)

part = Louvain(seed=1).fit(g)
print("partition:", part)
print("modularity:", round(g.modularity(part), 4))
print("all in one:", round(g.modularity({u: 0 for u in g.nodes()}), 4))
print("singletons:", round(g.modularity({u: u for u in g.nodes()}), 4))