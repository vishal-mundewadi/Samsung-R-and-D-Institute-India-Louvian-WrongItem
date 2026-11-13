const base = "http://localhost:5000/api";

async function call(path: string, method: string, token?: string, body?: object) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function run() {
  const login = await call("/auth/login", "POST", undefined, {
    email: "test@test.com",
    password: "test123",
  });
  const token = login.token;

  const cases = [
    ["RingA1", "shirt-x"], ["RingA1", "shirt-y"],
    ["RingA2", "shirt-x"], ["RingA2", "shirt-y"],
    ["RingB1", "phone-p"], ["RingB1", "phone-q"],
    ["RingB2", "phone-p"], ["RingB2", "phone-q"],
    ["Solo", "book-z"],
  ];
  for (const [seller, productName] of cases) {
    const order = await call("/orders", "POST", token, { productName, seller });
    await call("/disputes", "POST", token, { orderId: order._id, issueType: "wrong_item" });
  }

  const result = await call("/insights/seller-risk", "GET", token);
  console.log(JSON.stringify(result.clusters, null, 2));
}

run();