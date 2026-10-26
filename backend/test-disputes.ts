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
  return { status: res.status, data: await res.json() };
}

async function run() {
  const login = await call("/auth/login", "POST", undefined, {
    email: "test@test.com",
    password: "test123",
  });
  const token = login.data.token;
  console.log("LOGIN:", login.status);

  const order = await call("/orders", "POST", token, {
    productName: "Blue Cotton Shirt",
    color: "Blue",
    size: "M",
    seller: "TestSeller",
  });
  console.log("ORDER:", order.status, order.data._id);

  const dispute = await call("/disputes", "POST", token, {
    orderId: order.data._id,
    issueType: "wrong_item",
    description: "Ordered blue, received black",
  });
  console.log("DISPUTE:", dispute.status, dispute.data._id);

  const evidence = await call(`/disputes/${dispute.data._id}/evidence`, "POST", token, {
    url: "https://example.com/black-shirt.jpg",
  });
  console.log("EVIDENCE:", evidence.status, "items:", evidence.data.evidence?.length);

  const status = await call(`/disputes/${dispute.data._id}/status`, "PATCH", token, {
    status: "complaint_sent",
  });
  console.log("STATUS:", status.status, status.data.status);

  const noToken = await call("/disputes", "GET");
  console.log("NO TOKEN (should be 401):", noToken.status);

  const list = await call("/disputes", "GET", token);
  console.log("LIST:", list.status, "count:", list.data.length);
}

run();