import fs from "fs";

const base = "http://localhost:5000/api";

async function json(path: string, method: string, token?: string, body?: object) {
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

function photo(file: string) {
  return new Blob([fs.readFileSync(`../ai-service/${file}`)], { type: "image/png" });
}

async function verdict(token: string, id: string, a: string, b: string) {
  const form = new FormData();
  form.append("listing", photo(a), a);
  form.append("received", photo(b), b);
  const res = await fetch(`${base}/disputes/${id}/verdict`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return { status: res.status, data: await res.json() };
}

async function run() {
  const login = await json("/auth/login", "POST", undefined, {
    email: "test@test.com",
    password: "test123",
  });
  const token = login.token;
  const order = await json("/orders", "POST", token, { productName: "Blue Shirt", color: "Blue" });
  const dispute = await json("/disputes", "POST", token, {
    orderId: order._id,
    issueType: "wrong_item",
  });

  const bad = await verdict(token, dispute._id, "blue.png", "black.png");
  console.log("BLUE vs BLACK:", bad.status, bad.data.verdict ?? bad.data);

  const good = await verdict(token, dispute._id, "blue.png", "blue.png");
  console.log("BLUE vs BLUE:", good.status, good.data.verdict ?? good.data);
}

run();