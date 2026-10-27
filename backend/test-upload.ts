const base = "http://localhost:5000/api";
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

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

async function run() {
  const login = await json("/auth/login", "POST", undefined, {
    email: "test@test.com",
    password: "test123",
  });
  const token = login.token;
  const order = await json("/orders", "POST", token, { productName: "Blue Shirt" });
  const dispute = await json("/disputes", "POST", token, {
    orderId: order._id,
    issueType: "wrong_item",
  });

  const form = new FormData();
  form.append("image", new Blob([Buffer.from(PNG_BASE64, "base64")], { type: "image/png" }), "proof.png");

  const res = await fetch(`${base}/disputes/${dispute._id}/evidence/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data: any = await res.json();
  console.log("UPLOAD:", res.status);
  console.log("EVIDENCE:", data.evidence);
}

run();