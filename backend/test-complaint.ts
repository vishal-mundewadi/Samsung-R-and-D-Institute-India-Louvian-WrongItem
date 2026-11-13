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
  const order = await call("/orders", "POST", token, {
    productName: "Blue Cotton Shirt",
    color: "Blue",
    size: "M",
    seller: "TestSeller",
  });
  const dispute = await call("/disputes", "POST", token, {
    orderId: order._id,
    issueType: "wrong_item",
    description: "Ordered blue, received black",
  });
  const complaint = await call(`/disputes/${dispute._id}/complaint`, "GET", token);
  console.log("SUBJECT:", complaint.subject);
  console.log(complaint.body);
}

run();